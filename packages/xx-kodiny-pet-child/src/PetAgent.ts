import type * as proto from '@cp949/xx-kodiny-pet-proto';
import type { EventEmitter } from './eventemitter';
import { type PetCommandEventMap, type PetNotifyEventMap } from './events';
import { logger } from './logger';
import type {
  IPet,
  IPetAgent,
  IPetCommandRunner,
  IPetContext,
  PetCommandRunnerClassType,
  send2parent,
} from './types';
import { errmsg } from './util';

/**
 * 실행기(`IPetCommandRunner`)의 수명과 명령 실행을 맡는다.
 * 실행기를 만들어 `init()`하면서 부모에게 `__iframe-state`로 `starting`, `ready`를 알린다.
 */
export class PetAgent implements IPetAgent {
  private DEBUG = false;

  private commandRunner?: IPetCommandRunner;

  private readonly toParent: send2parent.ISendToParent;

  private readonly notifyEvents: EventEmitter<PetNotifyEventMap>;

  private readonly uiEvents: EventEmitter;

  private readonly context: IPetContext;

  private state_: 'starting' | 'ready' | 'stopping' | 'stopped' = 'stopped';

  constructor(
    pet: IPet,
    commandEvents: EventEmitter<PetCommandEventMap>,
    notifyEvents: EventEmitter<PetNotifyEventMap>,
    uiEvents: EventEmitter,
  ) {
    this.toParent = pet.toParent;
    this.notifyEvents = notifyEvents;
    this.uiEvents = uiEvents;
    this.context = {
      toParent: pet.toParent,
      commandEvents,
      notifyEvents,
      uiEvents,
    };
  }

  /** 에이전트 상태 */
  get state() {
    return this.state_;
  }

  /** 켜면 실행한 명령을 로그로 남긴다. */
  setDebugEnabled(enabled: boolean) {
    this.DEBUG = enabled;
  }

  private init_ = async (commandRunnerClass: PetCommandRunnerClassType) => {
    this.state_ = 'starting';
    // eslint-disable-next-line new-cap
    const commandRunner = new commandRunnerClass(this.context);
    this.commandRunner = commandRunner;
    this.toParent.event.emit('__iframe-state', 'starting');
    await commandRunner.init();

    this.toParent.event.emit('__iframe-state', 'ready');
    this.notifyEvents.emit('commandRunnerStateChanged', {
      state: 'initialized',
      commandRunner,
    });
    this.notifyEvents.emit('commandRunnerInitialized', commandRunner);
  };

  private destroy_ = async () => {
    const commandRunner = this.commandRunner;
    if (!commandRunner) {
      return;
    }
    try {
      this.toParent.event.emit('__iframe-state', 'stopped');
      await commandRunner.destroy();
      this.notifyEvents.emit('commandRunnerDestroyed');
    } catch (err) {
      logger.debug('PetAgent.destroy() ignore error: commandRunner.destroy() failed', errmsg(err));
    }
    this.commandRunner = undefined;
  };

  /**
   * 실행기를 만들어 초기화하고 시작한다.
   * 초기화하는 사이에 `stop()`이 불리면 시작하지 않는다.
   */
  start = async (commandRunnerClass: PetCommandRunnerClassType): Promise<void> => {
    await this.init_(commandRunnerClass);

    // 초기화하는 중에 stop이 호출될 수 있음
    if (this.state_ !== 'starting') {
      return;
    }

    const commandRunner = this.commandRunner;
    if (!commandRunner) {
      logger.debug('PetAgent.start() fail: command runner is not initialzed');
      this.state_ = 'stopped';
      this.notifyEvents.emit('commandRunnerStateChanged', {
        state: 'stopped',
      });
      return;
    }

    this.state_ = 'ready';
    this.notifyEvents.emit('commandRunnerStateChanged', {
      state: 'started',
      commandRunner,
    });
    this.notifyEvents.emit('commandRunnerStarted', commandRunner);
  };

  /**
   * 실행기를 멈춘다. 이미 `stopping`이거나 `stopped`이면 아무것도 하지 않는다.
   * 실행기 정리는 기다리지 않고 비동기로 돌린다.
   */
  stop = async (): Promise<void> => {
    if (this.state_ === 'stopping' || this.state_ === 'stopped') {
      logger.debug(`PetAgent.stop(): already stop state:${this.state_}`);
      return;
    }
    this.state_ = 'stopping';
    const runner = this.commandRunner;
    if (runner) {
      runner
        .stop()
        .catch((err: unknown) => {
          logger.debug(errmsg(err));
        })
        .finally(() => {
          this.destroy_()
            .catch(() => {
              // ignore error
            })
            .finally(() => {
              this.notifyEvents.emit('commandRunnerStateChanged', {
                state: 'stopped',
                commandRunner: runner,
              });

              this.notifyEvents.emit('commandRunnerStopped');
            });
        });
    }
    // 주의: 위 정리 체인이 돌기 전에 비운다. `destroy_`는 `this.commandRunner`를 읽으므로 실행기를 찾지 못하고 끝난다.
    // 그래서 `destroy()`와 부모로 가는 `__iframe-state stopped`가 나가지 않는다. 원본 동작이며 일부러 고치지 않았다.
    this.commandRunner = undefined;
    this.state_ = 'stopped';
  };

  /**
   * 부모가 보낸 명령을 실행기에서 실행하고 결과를 부모에게 응답한다.
   *
   * 규칙:
   * - `ready`가 아니면 응답 없이 무시한다.
   * - `cmd`와 같은 이름의 멤버가 함수가 아니면 경고만 남기고 응답하지 않는다.
   * - 함수가 던지면 `errorCode: unknown`과 `message`를 담아 실패 응답을 보낸다.
   */
  run = async (cmdRequest: proto.CmdRequest): Promise<void> => {
    if (this.state_ !== 'ready') {
      logger.debug('PetAgent.run(): agent not ready', cmdRequest);
      return;
    }

    const runner = this.commandRunner;
    if (!runner) {
      logger.debug('PetAgent.run(): commandRunner is not ready');
      return;
    }

    const { requestId, cmd, args = [] } = cmdRequest;
    if (!cmd) {
      return;
    }

    if (this.DEBUG) logger.debug('PetAgent.run() called', cmdRequest);

    // 허용 목록 없이 `cmd`와 같은 이름의 실행기 멤버를 그대로 호출한다.
    // `init`, `stop`, `destroy`도 부모가 호출할 수 있다. 원본 동작이다. `any`는 이 동적 접근 때문에 쓴다.
    const cmdFunction = (runner as any)[cmd];
    if (typeof cmdFunction !== 'function') {
      logger.warn('PetAgent.run(): cannot handle cmd=', cmd, 'runner=', runner);
      return;
    }

    try {
      // call command function
      const result = await cmdFunction.apply(runner, args as []);
      this.toParent.cmd.success({
        requestId,
        value: result,
      });
    } catch (err) {
      this.toParent.cmd.error({
        requestId,
        errorCode: 'unknown',
        message: errmsg(err),
      });
    }
  };
}
