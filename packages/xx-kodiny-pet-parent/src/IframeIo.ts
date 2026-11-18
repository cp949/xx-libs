import type * as proto from '@cp949/xx-kodiny-pet-proto';
import {
  BehaviorSubject,
  Subject,
  filter,
  firstValueFrom,
  interval,
  startWith,
  takeUntil,
  tap,
  timeout,
  type Observable,
} from 'rxjs';
import { EventEmitter } from './eventemitter/index.js';
import type { IConsole } from './types.js';
import { Closables } from './util/closables.js';

/** 요청 식별자 카운터. 모듈을 불러온 시각(ms)에서 시작한다. */
let seq_ = new Date().getTime();
function genReqId(): number {
  return ++seq_;
}

/**
 * `IframeController`가 쓰는 iframe 통신 계층. 패키지 밖으로 내보내지 않는다.
 * window의 `message` 이벤트를 받아 프레임 종류별로 나눈다.
 * - `__iframe-state` 이벤트: `state$`를 바꾼다.
 * - 그 밖의 이벤트: `events`로 내보낸다.
 * - 명령 응답: `message$`로 내보낸다.
 * `event.origin`과 `event.source`는 검사하지 않는다. `iframeToken` 문자열 일치만 확인한다.
 */
export class IframeIo {
  /** iframe이 보낸 명령 응답 프레임 */
  readonly message$ = new Subject<proto.CmdFrame>();

  /** iframe이 보낸 이벤트. 이벤트 이름을 미리 정할 수 없어 `any`로 열어 둔다. */
  readonly events = new EventEmitter<any>();

  /** 선택자에 맞는 iframe 요소. 없으면 `null` */
  readonly iframe$ = new BehaviorSubject<HTMLIFrameElement | null>(null);

  /** iframe의 수명 상태 */
  readonly state$ = new BehaviorSubject<proto.IframeState>('stopped');

  /** `stop()`에서 해제할 리스너와 구독 */
  readonly closables = new Closables();

  private logger: IConsole;

  constructor(
    private readonly iframeToken: string,
    private readonly iframeSelector: string,
  ) {
    this.logger = console;
  }

  /** `stop()`이 호출될 때 알리는 스트림 */
  get destroyTrigger$(): Observable<any> {
    return this.closables.closeTrigger$;
  }

  setLogger = (logger: IConsole | undefined): void => {
    this.logger = logger ? logger : console;
  };

  private onIframeMounted_ = (ifrm: HTMLIFrameElement): void => {
    if (this.iframe$.value !== ifrm) {
      this.logger.debug('IframeIo.onIframeMounted_()');
      this.iframe$.next(ifrm);
    }
  };

  private onIframeUnmounted_ = (): void => {
    if (this.iframe$.value) {
      this.logger.debug('IframeIo.onIframeUnmounted_()');
      this.iframe$.next(null);
    }

    if (this.state$.value !== 'stopped') {
      this.state$.next('stopped');
    }
  };

  private checkIframeMount_ = (): HTMLIFrameElement | null => {
    const ifrm: HTMLIFrameElement | null = document.querySelector(this.iframeSelector);
    if (ifrm) {
      this.onIframeMounted_(ifrm);
      return ifrm;
    }
    this.onIframeUnmounted_();
    return null;
  };

  /**
   * 메시지 수신을 시작한다.
   * iframe이 아직 없으면 500ms 간격으로 선택자를 다시 찾는다.
   */
  start = (): void => {
    const ifrm = this.checkIframeMount_();
    if (this.state$.value === 'starting' || this.state$.value === 'ready') {
      return;
    }
    this.state$.next('starting');
    this.logger.debug('[P] start message receiving');
    window.addEventListener('message', this.handleMessageFromIframe_);
    this.closables.add(() => {
      window.removeEventListener('message', this.handleMessageFromIframe_);
    });
    if (!ifrm) {
      interval(500)
        .pipe(
          startWith(1),
          tap(() => {
            this.checkIframeMount_();
          }),
          takeUntil(this.closables.closeTrigger$),
        )
        .subscribe();
    }
  };

  /** 수신 리스너와 구독을 해제하고 `state$`를 `stopped`로 바꾼다. */
  stop = (): void => {
    this.checkIframeMount_();
    this.logger.debug('IframeIo.stop()');
    this.closables.close();
    this.state$.next('stopped');
  };

  /**
   * iframe이 붙을 때까지 기다린다.
   * `timeoutMilli`가 0 이하이면 무한정 기다린다. 시간 안에 못 찾으면 `null`을 돌려준다.
   */
  waitUntilIframeMounted = async (timeoutMilli: number): Promise<HTMLIFrameElement | null> => {
    if (this.iframe$.value) return this.iframe$.value;
    const ifrm: HTMLIFrameElement | null = document.querySelector(this.iframeSelector);
    if (ifrm) {
      this.iframe$.next(ifrm);
      return ifrm;
    }
    const src$ = this.iframe$.pipe(filter(Boolean), takeUntil(this.closables.closeTrigger$));
    try {
      if (timeoutMilli <= 0) {
        return await firstValueFrom(src$);
      }
      return await firstValueFrom(src$.pipe(timeout(timeoutMilli)));
    } catch {
      return null;
    }
  };

  private handleMessageFromIframe_ = (event: MessageEvent): void => {
    const eventData = event.data as any;
    if (isDevTool(eventData)) return;
    const frameType = checkFrameType(eventData);
    if (!frameType) return;
    // console.log('[P] ', eventData);
    if (this.iframeToken !== frameType.iframeToken) {
      // ignore
      // console.log(`ignore, iframeToken mismatch: ${this.iframeToken} !== ${iframeToken}`)
      return;
    }
    this.logger.debug('handleMessage() eventData=', eventData);

    // check if event
    const eventFrame = checkEventFrame(eventData);
    if (eventFrame) {
      const args = eventFrame.args ?? [];
      if (eventFrame.eventKey === '__iframe-state' && typeof args[0] === 'string') {
        this.state$.next(args[0] as proto.IframeState);
        return;
      }
      this.events.emit(eventFrame.eventKey, ...args);
      return;
    }

    // check if cmd
    const cmdFrame = checkCmdFrame(eventData);
    if (cmdFrame) {
      this.logger.debug('[from IFRAME]', eventData);
      this.message$.next(eventData as proto.CmdFrame);
      return;
    }

    this.logger.debug(`ignore unknown message: ${JSON.stringify(eventData)}`);
  };

  /** 새 요청 식별자를 만든다. 모듈 안에서 1씩 늘어나는 번호다. */
  nextRequestId = (): number => genReqId();

  /**
   * iframe에 명령을 보내고 쓴 `requestId`를 돌려준다.
   * iframe이 없으면 3초까지 기다린다. 못 찾거나 `contentWindow`가 없으면 `undefined`를 돌려준다.
   * `requestId`를 생략하면 새로 만든다. 대상 origin은 `*`다.
   */
  sendCmd = async (
    cmd: string,
    args?: unknown[],
    requestId?: proto.RequestId,
  ): Promise<proto.RequestId | undefined> => {
    let iframe = this.checkIframeMount_();
    if (!iframe) {
      iframe = await this.waitUntilIframeMounted(3000);
      if (!iframe) {
        this.logger.info(
          'iframe not ready selector=',
          this.iframeSelector,
          document.querySelector(this.iframeSelector),
        );
        return undefined;
      }
    }

    if (!iframe.contentWindow) {
      this.logger.info('iframe contentWindow not ready');
      return undefined;
    }

    const reqId = requestId ? requestId : this.nextRequestId();
    const message = {
      requestId: reqId,
      type: 'cmd',
      cmd,
      args,
    };
    this.logger.debug('[to iframe]', message);
    iframe.contentWindow.postMessage(
      {
        requestId: reqId,
        type: 'cmd',
        cmd,
        args,
      },
      '*',
    );
    return reqId;
  };
}

function isDevTool(eventData: any): boolean {
  if (eventData['source']) {
    const source = eventData['source'];
    return typeof source === 'string' && source.startsWith('react-devtools');
  }
  return false;
}

/**
 * msg가 프레임 인지 체크
 * @param msg
 * @returns 프레임이 아니면 false를 리턴, frame이면 프레임 정보를 리턴한다.
 */
function checkFrameType(msg: any): false | { iframeToken: string; type: string } {
  if (typeof msg !== 'object') return false;

  const valid =
    'iframeToken' in msg &&
    typeof msg['iframeToken'] === 'string' &&
    'type' in msg &&
    typeof msg['type'] === 'string';
  if (!valid) {
    return false;
  }

  const type = msg['type'] as string;
  const validTypes = ['cmd', 'event'];
  if (validTypes.indexOf(type) >= 0) {
    return { iframeToken: msg['iframeToken'], type };
  }
  return false;
}

/**
 * msg가 cmd 프레임 인지 체크
 * @param msg - 검사할 메시지
 * @returns 프레임이 아니면 false를 리턴, 프레임이면 proto.CmdFrame 을 리턴한다.
 */
function checkCmdFrame(msg: any): false | proto.CmdFrame {
  const valid = msg['type'] === 'cmd' && typeof msg['success'] === 'boolean';
  if (!valid) return false;
  if (msg['success'] === false) {
    if (typeof msg['errorCode'] !== 'string') {
      // 에러인 경우에는 반드시 errorCode가 있어야 한다.
      return false;
    }
  }
  return msg as proto.CmdFrame;
}

/**
 * msg가 event 프레임 인지 체크
 * @param msg - 검사할 메시지
 * @returns 프레임이 아니면 false를 리턴, 프레임이면 proto.EventFrame 을 리턴한다.
 */
function checkEventFrame(data: any): false | proto.EventFrame {
  const valid = data['type'] === 'event' && typeof data['eventKey'] === 'string';

  if (!valid) {
    return false;
  }

  return data as proto.EventFrame;
}
