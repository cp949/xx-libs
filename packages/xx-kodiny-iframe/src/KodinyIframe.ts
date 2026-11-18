import type {
  CmdResponsePayload,
  NotificationPayload,
  RequestId,
} from '@cp949/xx-kodiny-iframe-proto';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, filter, firstValueFrom, map, take, takeUntil } from 'rxjs';
import { IframeIo } from './IframeIo.js';
import type { IConsole } from './types.js';

export class KodinyIframe {
  private readonly io: IframeIo;

  private logger: IConsole;

  constructor(iframeToken: string, iframeSelector: string) {
    this.io = new IframeIo(iframeToken, iframeSelector);
    this.logger = console;
  }

  setLogger = (logger: IConsole | undefined): void => {
    this.logger = logger ? logger : console;
    this.io.setLogger(this.logger);
  };

  get isStopped(): boolean {
    return this.io.state$.value === 'stopped';
  }

  get isReady(): boolean {
    return this.io.state$.value === 'ready';
  }

  get isStarting(): boolean {
    return this.io.state$.value === 'starting';
  }

  get isStartingOrReady(): boolean {
    return this.io.state$.value === 'starting' || this.io.state$.value === 'ready';
  }

  get state(): 'starting' | 'ready' | 'stopped' {
    return this.io.state$.value;
  }

  observeState = (): Observable<'starting' | 'ready' | 'stopped'> => {
    return this.io.state$;
  };

  observeIframeMounted = (): Observable<boolean> => {
    return this.io.iframe$.pipe(map(Boolean), distinctUntilChanged());
  };

  observeIframeReady = (): Observable<boolean> => {
    return this.io.state$.pipe(
      map((it) => it === 'ready'),
      distinctUntilChanged(),
    );
  };

  observeCmdResponse = (): Observable<CmdResponsePayload> => {
    return this.io.message$;
  };

  observeNotification = (): Observable<NotificationPayload> => {
    return this.io.notification$;
  };

  runCmd = async (cmd: string, args?: unknown[], requestId?: RequestId): Promise<any> => {
    const reqId = await this.io.sendCmd(cmd, args, requestId);
    if (!reqId) {
      this.logger.warn('request not created: cmd=', cmd);
      return undefined;
    }

    let responseData: CmdResponsePayload | undefined;
    try {
      responseData = await firstValueFrom(
        this.io.message$ //
          .pipe(
            filter((it) => it.requestId === reqId),
            take(1),
            takeUntil(this.io.destroyTrigger$),
          ),
      );
    } catch (err) {
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

  start = (): void => {
    this.io.start();
  };

  stop = (): void => {
    this.io.stop();
  };
}
