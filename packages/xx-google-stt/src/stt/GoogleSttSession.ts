import {
  BehaviorSubject,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  Subject,
  switchMap,
  take,
  takeUntil,
  timeout,
} from 'rxjs';
import type { Observable, Subscription } from 'rxjs';
import log from '../log.js';
import { RxWebAudio } from '../util/RxWebAudio.js';
import type {
  GoogleSttOptions,
  GoogleSttRecognition,
  GoogleSttSessionState,
  GoogleSttSocketState,
} from './google-stt-types.js';
import { GoogleSttSocket } from './GoogleSttSocket.js';

const DEBUG = false;

export class GoogleSttSession {
  private requestSubscription_: Subscription | null = null;

  private finishSubscription_: Subscription | null = null;

  private socketSubscription_: Subscription | null = null;

  private closed_ = true;

  private runningState$ = new BehaviorSubject<GoogleSttSessionState>('stopped');

  private recognizedText$ = new BehaviorSubject<string>('');

  private error$ = new BehaviorSubject<any>(null);

  private sttSocket_: GoogleSttSocket;

  private closeTrigger$ = new BehaviorSubject<boolean>(false);

  constructor(
    socketIoUrl: string,
    socketIoPath: string,
    private stopTrigger: Observable<any>,
    private sttTimeout: number,
  ) {
    this.sttSocket_ = new GoogleSttSocket(stopTrigger, socketIoUrl, socketIoPath);
  }

  observeState = (): Observable<GoogleSttSessionState> => this.runningState$.asObservable();

  observeRecognition = (): Observable<GoogleSttRecognition> => this.sttSocket_.observeRecognition();

  observeConnectedOrNot = (): Observable<boolean> => this.sttSocket_.observeConnectedOrNot();

  observeError = (): Observable<any> => this.error$.pipe(filter(Boolean));

  private closeTrigger = (): Observable<boolean> => {
    return this.closeTrigger$.pipe(filter((it) => it));
  };

  open = (media: MediaStream, opts: GoogleSttOptions) => {
    if (DEBUG) log.debug('GSTT session started');
    this.closed_ = false;
    this.runningState$.next('running');
    this.recognizedText$.next('');
    this.sttSocket_.sendSessionStart(opts).catch(() => {
      // ignore
    });
    const recognizeFinishTrigger = new Subject<any>();

    this.finishSubscription_ = this.sttSocket_
      .observeRecognition()
      .pipe(takeUntil(this.stopTrigger), takeUntil(this.closeTrigger()))
      .subscribe(({ state }) => {
        if (state === 'recognize-finished') {
          recognizeFinishTrigger.next(1);
          this.close();
        }
      });
    this.checkSocketDisconnected();
    this.startRequestChannel(media);
  };

  private checkSocketDisconnected = () => {
    const state$ = new BehaviorSubject<GoogleSttSocketState>('FIRST');
    this.socketSubscription_ = this.sttSocket_
      .observeSocketState() //
      .subscribe((state) => {
        state$.next(state);
      });

    // stt socket이 연결되었다가, 끊어지면, 세션도 close한다
    const s2 = state$
      .pipe(
        filter((it) => it === 'CONNECTED'),
        take(1),
        switchMap(() => state$.pipe(filter((it) => it === 'DISCONNECTED'))),
        take(1),
        takeUntil(this.stopTrigger),
        takeUntil(this.closeTrigger()),
      )
      .subscribe(() => {
        this.close();
      });

    this.socketSubscription_.add(s2);
  };

  private startRequestChannel = (media: MediaStream) => {
    if (DEBUG) log.debug('GSTT startRequestChannel()');
    const recognizeEnabled = this.sttSocket_.observeRecognition().pipe(
      map(({ state }) => state === 'recognize-started' || state === 'recognizing'),
      distinctUntilChanged(),
    );

    this.requestSubscription_ = recognizeEnabled
      .pipe(
        switchMap((enabled) => {
          return enabled ? RxWebAudio.sampling(media, 16000, 2048) : EMPTY;
        }),
        takeUntil(this.stopTrigger),
        takeUntil(this.closeTrigger()),
        timeout({ first: this.sttTimeout }),
      )
      .subscribe((speechData) => {
        if (!this.closed_) {
          this.sttSocket_.sendSpeech(new Uint8Array(speechData.buffer)).catch(() => {
            // ignore
          });
        }
      });
  };

  close = () => {
    if (DEBUG) log.debug('GSTT closed');
    this.closed_ = true;
    this.requestSubscription_?.unsubscribe();
    this.finishSubscription_?.unsubscribe();
    this.socketSubscription_?.unsubscribe();
    this.requestSubscription_ = null;
    this.finishSubscription_ = null;
    this.socketSubscription_ = null;
    if (this.runningState$.value !== 'stopped') {
      this.runningState$.next('stopped');
    }
    this.sttSocket_.disconnect();
    this.closeTrigger$.next(true);
  };
}
