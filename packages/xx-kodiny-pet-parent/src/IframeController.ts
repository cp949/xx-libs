import type * as proto from '@cp949/xx-kodiny-pet-proto';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, filter, firstValueFrom, map, take, takeUntil } from 'rxjs';
import type { EventEmitter } from './eventemitter/index.js';
import { IframeIo } from './IframeIo.js';
import type { IConsole } from './types.js';

/**
 * 부모 페이지에서 iframe 하나를 제어한다.
 * iframe에는 `postMessage`로 명령을 보내고, iframe이 보낸 응답과 이벤트를 받는다.
 * 생성자의 `iframeToken`과 같은 토큰을 가진 프레임만 처리한다. `iframeSelector`는 iframe을 찾는 CSS 선택자다.
 * `start()`를 호출해야 메시지 수신을 시작하고, 쓰고 나면 `stop()`을 호출한다.
 */
export class IframeController {
  private readonly io: IframeIo;

  private logger: IConsole;

  constructor(iframeToken: string, iframeSelector: string) {
    this.io = new IframeIo(iframeToken, iframeSelector);
    this.logger = console;
  }

  /** 로그 출력 대상을 바꾼다. `undefined`이면 `console`로 되돌린다. */
  setLogger = (logger: IConsole | undefined): void => {
    this.logger = logger ? logger : console;
    this.io.setLogger(this.logger);
  };

  /** `state`가 `stopped`인지 여부 */
  get isStopped(): boolean {
    return this.io.state$.value === 'stopped';
  }

  /** `state`가 `ready`인지 여부 */
  get isReady(): boolean {
    return this.io.state$.value === 'ready';
  }

  /** `state`가 `starting`인지 여부 */
  get isStarting(): boolean {
    return this.io.state$.value === 'starting';
  }

  /** `state`가 `starting`이거나 `ready`인지 여부 */
  get isStartingOrReady(): boolean {
    return this.io.state$.value === 'starting' || this.io.state$.value === 'ready';
  }

  /**
   * iframe의 현재 수명 상태.
   * `start()` 직후 `starting`이 되고, iframe이 `__iframe-state` 이벤트로 알린 값으로 바뀐다.
   * iframe이 사라지거나 `stop()`을 부르면 `stopped`가 된다.
   */
  get state(): 'starting' | 'ready' | 'stopped' {
    return this.io.state$.value;
  }

  /**
   * iframe이 보낸 이벤트를 `eventKey`로 구독하는 emitter.
   * 이벤트 이름과 인자를 미리 정할 수 없어 `any`로 열어 둔다.
   */
  get events(): EventEmitter<any> {
    return this.io.events;
  }

  /** `state`가 바뀔 때마다 값을 내보내는 스트림. 구독하면 현재 값을 먼저 내보낸다. */
  observeState = (): Observable<'starting' | 'ready' | 'stopped'> => {
    return this.io.state$;
  };

  /** iframe이 문서에 붙어 있는지를 값이 바뀔 때만 내보내는 스트림 */
  observeIframeMounted = (): Observable<boolean> => {
    return this.io.iframe$.pipe(map(Boolean), distinctUntilChanged());
  };

  /** `state`가 `ready`인지를 값이 바뀔 때만 내보내는 스트림 */
  observeIframeReady = (): Observable<boolean> => {
    return this.io.state$.pipe(
      map((it) => it === 'ready'),
      distinctUntilChanged(),
    );
  };

  /** iframe이 보낸 명령 응답 프레임 스트림. `requestId`가 달라도 모두 내보낸다. */
  observeCmdResponse = (): Observable<proto.CmdFrame> => {
    return this.io.message$;
  };

  /**
   * iframe에 명령을 보내고 같은 `requestId`의 응답을 기다린다.
   * `requestId`를 생략하면 새로 만든다. 응답을 기다리는 시간 제한은 없고, `stop()`을 부르면 기다림을 끝낸다.
   * 명령마다 반환 타입이 달라 `any`를 돌려준다.
   *
   * 반환 규칙:
   * - 성공 응답이면 `value`를 돌려준다.
   * - iframe을 3초 안에 찾지 못하거나 요청을 만들지 못하면 `undefined`를 돌려준다.
   * - 응답을 기다리다 `stop()`되면 `undefined`를 돌려준다.
   * - `errorCode`가 있는 실패 응답이면 던지지 않고 `null`을 돌려준다.
   * - `errorCode`가 빈 문자열인 실패 응답이면 `message`로 `Error`를 던진다.
   */
  runCmd = async (cmd: string, args?: unknown[], requestId?: proto.RequestId): Promise<any> => {
    const reqId = await this.io.sendCmd(cmd, args, requestId);
    if (!reqId) {
      this.logger.warn('request not created: cmd=', cmd);
      return undefined;
    }

    let responseData: proto.CmdFrame | undefined;
    try {
      responseData = await firstValueFrom(
        this.io.message$ //
          .pipe(
            filter((it) => it.requestId === reqId),
            take(1),
            takeUntil(this.io.destroyTrigger$),
          ),
      );
    } catch {
      return undefined;
    }

    if (!responseData) {
      return undefined;
    }

    if (responseData.success) {
      return responseData.value;
    }

    const { errorCode, message } = responseData;
    if (!errorCode) {
      console.log(
        '[P] runCmd() ignore response, success = false, but errorCode empty',
        responseData,
      );
      const msg = message ? message : errorCode;
      throw new Error(msg ? msg : 'error occured');
    }
    // throw new Error(errorCode)
    return null;
  };

  /** 메시지 수신을 시작한다. 이미 `starting`이거나 `ready`이면 아무것도 하지 않는다. */
  start = (): void => {
    this.io.start();
  };

  /** 메시지 수신을 멈추고 `state`를 `stopped`로 바꾼다. */
  stop = (): void => {
    this.io.stop();
  };
}
