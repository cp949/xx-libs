import type { NotificationPayload, RequestId } from '@cp949/xx-kodiny-hw-iframe';
import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, firstValueFrom, map, take } from 'rxjs';
import { HwIframeIo } from './HwIframeIo';
import type { CmdResponseData, IframeConnectionState } from './types';

export class HwIframeManager {
  private readonly io: HwIframeIo;

  readonly hwId$ = new BehaviorSubject<string | undefined>(undefined);

  private logger: Console;

  constructor(iframeSelector: string) {
    this.io = new HwIframeIo(iframeSelector);
    this.logger = console;
  }

  setLogger = (logger: Console | undefined) => {
    this.logger = logger ?? console;
    this.io.setLogger(this.logger);
  };

  isConnected = (): boolean => {
    return this.io.state$.value === 'connected';
  };

  waitUntilConnected = async (): Promise<void> => {
    await firstValueFrom(this.io.state$.pipe(filter((it) => it === 'connected')));
  };

  get isStopped(): boolean {
    return this.io.state$.value === 'stopped';
  }

  get state(): IframeConnectionState {
    return this.io.state$.value;
  }

  observeState = (): Observable<IframeConnectionState> => {
    return this.io.state$;
  };

  observeIframeMounted = (): Observable<boolean> => {
    return this.io.iframe$.pipe(map(Boolean), distinctUntilChanged());
  };

  observeCmdResponse = (): Observable<CmdResponseData> => {
    return this.io.message$;
  };

  observeNotification = (): Observable<NotificationPayload> => {
    return this.io.notification$;
  };

  runCmd = async (cmd: string, args?: unknown[], requestId?: RequestId): Promise<any> => {
    const reqId = await this.io.sendCmd(cmd, args, requestId);
    if (!reqId) {
      this.logger.warn('request not created');
      return undefined;
    }

    let responseData: CmdResponseData | undefined;
    try {
      // TODO timeout check
      responseData = await firstValueFrom(
        this.io.message$.pipe(
          filter((it) => it.requestId === reqId),
          take(1),
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
      throw new Error(message ?? errorCode ?? 'error occured');
    }
    // throw new Error(errorCode)
    return null;
  };

  start = (hwId: string | undefined, iframeSelector: string) => {
    this.hwId$.next(hwId);
    this.io.start();
  };

  /**
   * iframe을 강제로 닫아 버린 경우 disconnected 이벤트를 못받을 수 있다.
   * 강제로 disconnected로 설정한다
   */
  updateDisconnectedForce = () => {
    this.io.stop();
  };

  stop = () => {
    console.log('HwIframeManager.stop()');
    this.io.stop();
    this.hwId$.next(undefined);
  };
}
