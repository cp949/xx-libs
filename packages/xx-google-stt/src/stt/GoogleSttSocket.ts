import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  takeUntil,
  tap,
} from 'rxjs';
import type { Observable, Subscription } from 'rxjs';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import log from '../log.js';
import type {
  GoogleSttOptions,
  GoogleSttRecognition,
  GoogleSttSocketState,
} from './google-stt-types.js';

const DEBUG = false;

export class GoogleSttSocket {
  private socketState$ = new BehaviorSubject<GoogleSttSocketState>('FIRST');
  private recognition$ = new BehaviorSubject<GoogleSttRecognition>({
    state: 'none',
  });

  constructor(
    public destroy$: Observable<any>,
    private socketIoUrl: string,
    private socketIoPath: string,
  ) {
    // empty
  }

  private sock_: Socket | null = null;

  private subscription_: Subscription | null = null;

  getSocketState = (): GoogleSttSocketState => {
    return this.socketState$.value;
  };

  observeSocketState = (): Observable<GoogleSttSocketState> => this.socketState$.asObservable();

  observeConnectedOrNot = (): Observable<boolean> =>
    this.socketState$.pipe(
      map((it) => it === 'CONNECTED'),
      distinctUntilChanged(),
    );

  isConnected = (): boolean => this.sock_?.connected === true;

  observeRecognition = (): Observable<GoogleSttRecognition> => this.recognition$.asObservable();

  sendSessionStart = async (opts: GoogleSttOptions) => {
    return this.callSocket((sock) => {
      if (DEBUG) log.debug('GSTT stt:start:', opts);
      sock.emit('stt:start', opts);
    });
  };

  sendSpeech = async (speechData: Uint8Array): Promise<boolean> => {
    return this.callSocket((sock) => {
      if (sock.connected) {
        if (DEBUG) log.debug('GSTT stt:speaking', speechData.byteLength);
        sock.emit('stt:speaking', speechData);
      }
    });
  };

  private callSocket = async (sendFn: (sock: Socket) => void): Promise<boolean> => {
    this.connect();
    const src$ = this.observeSocket().pipe(
      filter((sock) => sock !== null),
      tap((sock) => {
        sendFn(sock!);
      }),
      takeUntil(this.destroy$),
    );

    try {
      await firstValueFrom(src$);
      return true;
    } catch (err) {
      log.debug(err);
    }
    return false;
  };

  private onRecognizeStarted = () => {
    this.recognition$.next({ state: 'recognize-started' });
  };

  private onRecognizing = (transcript: string) => {
    this.recognition$.next({ state: 'recognizing', transcript });
  };

  private onRecognizeFinishing = () => {
    const { transcript = '' } = this.recognition$.value;
    if (!transcript) {
      log.warn('stt:recognize-finishing received, but no previous transcript');
    }
    this.recognition$.next({ state: 'recognize-finishing', transcript });
  };

  private onRecognizeFinished = (transcript: string) => {
    this.recognition$.next({ state: 'recognize-finished', transcript });
  };

  /**
   * 상태가 정상일때 소켓을 발행한다
   */
  observeSocket = (): Observable<Socket | null> => {
    this.connect();
    return this.socketState$.pipe(
      // tap((it) => log.debug('XXXX SOCKET STATE:' + it)),
      map((it) => (it === 'CONNECTED' ? this.sock_! : null)),
      takeUntil(this.destroy$),
    );
  };

  private onConnect = () => {
    if (DEBUG) log.debug('GSTT connected');
    this.socketState$.next('CONNECTED');
  };

  private onDisconnect = () => {
    if (DEBUG) log.debug('GSTT disconnected');
    this.socketState$.next('DISCONNECTED');
    const lastRecognition = this.recognition$.value;
    if (lastRecognition.state !== 'none' && lastRecognition.state !== 'recognize-finished') {
      this.recognition$.next({
        state: 'recognize-finished',
        transcript: lastRecognition.transcript,
      });
    }
  };

  private onError = (msg: any) => {
    if (DEBUG) log.debug('GSTT onError', msg);
  };

  connect = () => {
    this.open_();
  };

  disconnect = () => {
    this.close_();
  };

  private close_ = () => {
    if (DEBUG) log.debug('GSTT socket closed');
    if (this.sock_ !== null) {
      if (this.sock_.connected) {
        this.sock_.disconnect();
      }
      this.sock_ = null;
    }
    this.subscription_?.unsubscribe();
    this.subscription_ = null;
  };

  private open_ = () => {
    if (this.sock_ !== null) {
      return;
    }
    this.socketState$.next('FIRST');
    this.sock_ = io(this.socketIoUrl, {
      autoConnect: false,
      reconnection: false,
      path: this.socketIoUrl.includes('localhost') ? '/socket.io' : this.socketIoPath,
    });

    this.sock_.connect();

    const s = this.sock_;
    s.on('connect', this.onConnect);
    s.on('disconnect', this.onDisconnect);
    s.on('error', this.onError);
    s.on('stt:recognizing', this.onRecognizing);
    s.on('stt:recognize-started', this.onRecognizeStarted);
    s.on('stt:recognize-finishing', this.onRecognizeFinishing);
    s.on('stt:recognize-finished', this.onRecognizeFinished);
  };
}
