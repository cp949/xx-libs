import { EventEmitter } from './eventemitter';
import { type PetCommandEventMap, type PetNotifyEventMap } from './events';
import { IframeCommandReceiver } from './IframeCommandReceiver';
import { logger } from './logger';
import { PetAgent } from './PetAgent';
import { SendToParentImpl } from './SendToParentImpl';
import type { IPet, IPetConfig, PetCommandRunnerClassType } from './types';
import { errmsg } from './util';

/**
 * iframe 안에서 돌며 부모 페이지와 통신하는 pet의 진입점.
 * `start()`가 실행기를 만들어 초기화하고, 부모가 보낸 명령을 실행기에 전달한다.
 * 페이지가 `beforeunload`되면 `stop()`을 부른다.
 */
export class KodinyPet implements IPet {
  /** 부모 페이지로 보내는 통로 */
  readonly toParent: SendToParentImpl;

  /** 부모가 보낸 명령을 받는 수신기 */
  readonly commandReceiver: IframeCommandReceiver;

  private commandRunnerClass: PetCommandRunnerClassType;

  private agent?: PetAgent;

  /** 부모가 보낸 명령 이벤트 */
  readonly commandEvents = new EventEmitter<PetCommandEventMap>();

  /** pet과 실행기의 상태 이벤트 */
  readonly notifyEvents = new EventEmitter<PetNotifyEventMap>();

  /** 실행기와 사용자 코드가 주고받는 이벤트 */
  readonly uiEvents = new EventEmitter();

  private iframeLoaded_ = false;

  private stopped_ = true;

  private DEBUG = false;

  constructor(options: IPetConfig) {
    this.toParent = new SendToParentImpl(options.iframeToken);
    this.commandRunnerClass = options.commandRunnerClass;
    this.commandReceiver = new IframeCommandReceiver(this.commandEvents);
    this.init_();
  }

  private init_() {
    this.setDebugEnabled(this.DEBUG);

    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded_);
    window.addEventListener('beforeunload', this.onIframeBeforeUnload_);
  }

  /** 켜면 수신기, 부모 전송, 에이전트가 디버그 로그를 더 남긴다. */
  setDebugEnabled(enabled: boolean) {
    this.DEBUG = enabled;
    this.commandReceiver.setDebugEnabled(enabled);
    this.toParent.setDebugEnabled(enabled);
    this.agent?.setDebugEnabled(enabled);
  }

  /**
   * 에이전트를 만들어 시작하고 부모 명령 수신을 연다. 이미 시작했으면 아무것도 하지 않는다.
   * 에이전트 시작이 실패해도 로그만 남기고 계속 진행해 `stateChanged`로 `started`를 알린다.
   */
  start = async (): Promise<void> => {
    if (!this.stopped_) {
      logger.debug('KodinyPet.start() already started');
      return;
    }
    const agent = new PetAgent(this, this.commandEvents, this.notifyEvents, this.uiEvents);
    this.agent = agent;
    agent.setDebugEnabled(this.DEBUG);

    this.stopped_ = false;
    logger.debug('KodinyPet.start() starting...');
    await agent
      .start(this.commandRunnerClass)
      .catch((err: unknown) => {
        logger.debug('KodinyPet.start() agent start failed', errmsg(err));
      })
      .then(() => {
        logger.debug('KodinyPet.start() started!!');
      });

    this.commandReceiver.startListen();
    this.commandReceiver.registerOnCmdReceive(agent.run);
    this.notifyEvents.emit('stateChanged', 'started');
  };

  /**
   * 에이전트를 멈추고 수신을 닫는다. 이미 멈췄으면 아무것도 하지 않는다.
   * 끝에서 `notifyEvents`, `commandEvents`, `uiEvents`의 리스너를 모두 지우므로 다시 `start()`하면 리스너를 다시 달아야 한다.
   */
  stop = async (): Promise<void> => {
    if (this.stopped_) {
      logger.debug('KodinyPet.stop() already stopped');
      return;
    }
    logger.debug('KodinyPet.stop() stopping...');
    this.notifyEvents.emit('stateChanged', 'stopping');
    const agent = this.agent;
    this.agent = undefined;
    if (agent) {
      this.commandReceiver.unregisterOnCmdReceive(agent.run);
      await agent.stop().catch((err: unknown) => {
        logger.debug('KodinyPet.stop() ignore error: agent.stop() fail', errmsg(err));
      });
    }

    this.stopped_ = true;
    this.commandReceiver.stopListen();
    this.notifyEvents.emit('stateChanged', 'stopped');

    this.notifyEvents.removeAllListeners();
    this.commandEvents.removeAllListeners();
    this.uiEvents.removeAllListeners();
    logger.debug('KodinyPet.stop() stopped!!');
  };

  private onDOMContentLoaded_ = () => {
    logger.debug('KodinyPet.onDOMContentLoaded_() iframe loaded');
    this.iframeLoaded_ = true;
    this.notifyEvents.emit('pageStateChanged', 'loaded');
  };

  private onIframeBeforeUnload_ = () => {
    logger.debug('KodinyPet.onIframeBeforeUnload_() iframe beforeunload');
    this.iframeLoaded_ = false;

    this.stop()
      .catch((err: unknown) => {
        logger.debug('KodinyPet.onIframeBeforeUnload_() ignore error', errmsg(err));
      })
      .finally(() => {
        this.notifyEvents.emit('pageStateChanged', 'unloaded');
      });
  };
}
