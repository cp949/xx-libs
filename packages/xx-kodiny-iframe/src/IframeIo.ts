import type {
  CmdResponsePayload,
  IframeState,
  NotificationPayload,
  RequestId,
} from '@cp949/xx-kodiny-iframe-proto';
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
} from 'rxjs';
import type { IConsole } from './types.js';

let seq_ = new Date().getTime();
function genReqId(): number {
  return ++seq_;
}

export class IframeIo {
  readonly message$ = new Subject<CmdResponsePayload>();

  readonly notification$ = new Subject<NotificationPayload>();

  readonly iframe$ = new BehaviorSubject<HTMLIFrameElement | null>(null);

  readonly state$ = new BehaviorSubject<IframeState>('stopped');

  readonly destroyTrigger$ = new Subject<any>();

  private logger: IConsole;

  constructor(
    private readonly iframeToken: string,
    private readonly iframeSelector: string,
  ) {
    this.logger = console;
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
    if (this.iframe$.value !== null) {
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

  start = (): void => {
    // this.logger.debug(
    //   'XXX IframeIo.start() selector=',
    //   this.iframeSelector,
    //   document.querySelector(this.iframeSelector),
    // );
    const ifrm = this.checkIframeMount_();
    if (this.state$.value === 'starting' || this.state$.value === 'ready') {
      // console.warn('XXX already running');
      return;
    }
    this.state$.next('starting');
    console.log('[P] start message receiving');
    window.addEventListener('message', this.handleMessageFromIframe_);
    if (!ifrm) {
      interval(500)
        .pipe(
          startWith(1),
          tap(() => {
            this.checkIframeMount_();
          }),
          takeUntil(this.destroyTrigger$),
        )
        .subscribe();
    }
  };

  stop = (): void => {
    this.checkIframeMount_();
    this.logger.debug('IframeIo.stop()');
    this.destroyTrigger$.next(true);
    this.state$.next('stopped');
    window.removeEventListener('message', this.handleMessageFromIframe_);
  };

  waitUntilIframeMounted = async (timeoutMilli: number): Promise<HTMLIFrameElement | null> => {
    if (this.iframe$.value) return this.iframe$.value;
    const ifrm: HTMLIFrameElement | null = document.querySelector(this.iframeSelector);
    if (ifrm) {
      this.iframe$.next(ifrm);
      return ifrm;
    }
    const src$ = this.iframe$.pipe(filter(Boolean), takeUntil(this.destroyTrigger$));
    try {
      if (timeoutMilli <= 0) {
        return await firstValueFrom(src$);
      }
      return await firstValueFrom(src$.pipe(timeout(timeoutMilli)));
    } catch (err) {
      return null;
    }
  };

  private handleMessageFromIframe_ = (event: MessageEvent): void => {
    const eventData = event.data as any;
    if (isDevTool(eventData)) return;
    // console.log('[P] ', eventData);
    const { iframeToken, success } = eventData;
    if (this.iframeToken !== iframeToken) {
      // ignore
      // console.log(`ignore, iframeToken mismatch: ${this.iframeToken} !== ${iframeToken}`)
      return;
    }

    if (typeof success !== 'boolean') {
      if (eventData['source']) this.logger.debug('[P] ignore unexpected response:', eventData);
      return;
    }

    this.logger.debug('handleMessage() eventData=', eventData);
    if (eventData['type'] === 'notify') {
      if (eventData['kind'] === 'iframe-state' && Boolean(eventData['value'])) {
        const newState = eventData['value'];
        if (this.state$.value !== newState) {
          console.log(`update iframe state to ${newState}`);
          this.state$.next(newState as IframeState);
        }
      } else {
        this.notification$.next(eventData as NotificationPayload);
      }
    } else if (eventData['type'] === 'cmd') {
      this.logger.debug('[from IFRAME]', eventData);
      this.message$.next(eventData as CmdResponsePayload);
    } else {
      this.logger.debug('ignore: unknown iframe data', eventData);
    }
  };

  nextRequestId = (): number => genReqId();

  sendCmd = async (
    cmd: string,
    args?: unknown[],
    requestId?: RequestId,
  ): Promise<RequestId | undefined> => {
    //  console.log('sendCmd:', cmd, args)
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
