import type {
  ErrorResponsePayload,
  NotificationPayload,
  RequestId,
  SuccessResponsePayload,
} from '@cp949/xx-kodiny-hw-iframe';
import {
  BehaviorSubject,
  Subject,
  distinctUntilChanged,
  filter,
  finalize,
  firstValueFrom,
  interval,
  map,
  startWith,
  takeUntil,
  tap,
  timeout,
} from 'rxjs';
import type { IframeConnectionState } from './types';

type CmdResponseData = SuccessResponsePayload | ErrorResponsePayload;

let seq_ = new Date().getTime();
function genReqId() {
  return ++seq_;
}

export class HwIframeIo {
  readonly message$ = new Subject<CmdResponseData>();

  readonly notification$ = new Subject<NotificationPayload>();

  readonly iframe$ = new BehaviorSubject<HTMLIFrameElement | null>(null);

  readonly state$ = new BehaviorSubject<IframeConnectionState>('stopped');

  readonly destroyTrigger$ = new Subject<any>();

  private logger: Console;

  constructor(private readonly iframeSelector: string) {
    this.logger = console;
  }

  setLogger = (logger: Console | undefined) => {
    this.logger = logger ?? console;
  };

  private onIframeMounted_ = (ifrm: HTMLIFrameElement) => {
    if (this.iframe$.value !== ifrm) {
      this.logger.debug('HwIframeIo.onIframeMounted_()');
      this.iframe$.next(ifrm);
    }
  };

  private onIframeUnmounted_ = () => {
    if (this.iframe$.value !== null) {
      this.logger.debug('HwIframeIo.onIframeUnmounted_()');
      this.iframe$.next(null);
    }

    if (this.state$.value !== 'stopped') {
      this.state$.next('stopped');
    }
  };

  // TODO: rename: checkIframeMount_
  private checkIframeReady_ = (): HTMLIFrameElement | null => {
    const ifrm: HTMLIFrameElement | null = document.querySelector(this.iframeSelector);
    if (ifrm) {
      this.onIframeMounted_(ifrm);
      return ifrm;
    }
    this.onIframeUnmounted_();
    return null;
  };

  start = () => {
    this.logger.debug('HwIframeIo.start()', this.iframeSelector);
    const ifrm = this.checkIframeReady_();
    if (this.state$.value !== 'stopped') {
      console.warn('already running');
      return;
    }
    this.state$.next('started');
    if (!ifrm) {
      // from(this.waitUntilElement_(this.iframeSelector, -1))
      interval(500)
        .pipe(
          startWith(1),
          tap(() => {
            this.checkIframeReady_();
          }),
          takeUntil(this.destroyTrigger$),
        )
        .subscribe();
    }
    this.notification$
      .pipe(
        filter((it) => it.kind === 'connectionState'),
        map((it) => it.value),
        distinctUntilChanged(),
        takeUntil(this.destroyTrigger$),
        finalize(() => {
          this.stop();
        }),
      )
      .subscribe((state) => {
        if (state) {
          this.state$.next(state);
        }
      });

    window.addEventListener('message', this.handleMessageFromIframe_);
  };

  stop = () => {
    this.checkIframeReady_();
    this.logger.debug('HwIframeIo.stop()');
    this.destroyTrigger$.next(true);
    this.state$.next('stopped');
    window.removeEventListener('message', this.handleMessageFromIframe_);
  };

  waitUntilIframeReady = async (timeoutMilli: number): Promise<HTMLIFrameElement | null> => {
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
    } catch {
      return null;
    }
  };

  private handleMessageFromIframe_ = (event: MessageEvent) => {
    const eventData = event.data;
    if (isDevTool(eventData)) return;
    const { success } = eventData;
    if (typeof success !== 'boolean') {
      if (eventData['source']) this.logger.debug('[P] ignore unexpected response:', eventData);
      return;
    }

    if (eventData['type'] === 'notify') {
      this.notification$.next(eventData);
    } else if (eventData['type'] === 'cmd') {
      this.logger.debug('[from IFRAME]', eventData);
      this.message$.next(eventData as CmdResponseData);
    } else {
      this.logger.warn('ignore: unknown iframe data', eventData);
    }
  };

  nextRequestId = (): number => genReqId();

  sendCmd = async (
    cmd: string,
    args?: unknown[],
    requestId?: RequestId,
  ): Promise<RequestId | undefined> => {
    let iframe = this.checkIframeReady_();
    if (!iframe) {
      iframe = await this.waitUntilIframeReady(3000);
      if (!iframe) {
        this.logger.info('iframe not ready');
        return undefined;
      }
    }

    if (!iframe.contentWindow) {
      this.logger.info('iframe contentWindow not ready');
      return undefined;
    }

    requestId = requestId ? requestId : this.nextRequestId();
    const message = {
      requestId,
      type: 'cmd',
      cmd,
      args,
    };
    this.logger.debug('[to iframe]', message);
    iframe.contentWindow.postMessage(
      {
        requestId,
        type: 'cmd',
        cmd,
        args,
      },
      '*',
    );
    return requestId;
  };

  private waitUntilElement_ = async (selector: string, timeoutMilli = -1): Promise<boolean> => {
    let elem: HTMLIFrameElement | null = null;
    let elapsed = 0;
    const tick = 50;

    for (let i = 0; ; i++) {
      elem = document.querySelector(selector);
      if (elem) {
        break;
      }
      elapsed += tick;
      if (elapsed % 1000 === 0) {
        this.logger.debug(`waitUntilElement(${selector}): wait iframe`);
      }

      if (timeoutMilli > 0 && elapsed >= timeoutMilli) {
        this.logger.debug(`waitUntilElement(${selector}): timeout`);
        break;
      }

      await sleepAsync(tick);
    }
    return Boolean(elem);
  };
}

function isDevTool(eventData: any) {
  if (eventData['source']) {
    const source = eventData['source'];
    return typeof source === 'string' && source.startsWith('react-devtools');
  }
  return false;
}

function sleepAsync(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve, ms);
  });
}
