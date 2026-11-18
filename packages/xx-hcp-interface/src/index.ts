import { Observable } from 'rxjs';
import { IHcpHwNotification } from './hw';
export * from './hw';
export * from './HcpNotificationEvent';

export type HwDeviceState = 'opening' | 'opened' | 'closing' | 'closed';

export type BufferTimestamped = { timestamp: number; dataBuffer: Uint8Array };

export interface IDevice {
  isOpened: () => boolean;
  waitUntilOpened: (timeoutMilli: number) => Promise<boolean>;
  write: (buffer: Uint8Array) => Promise<void>;
  observeRawData: () => Observable<BufferTimestamped>;
  observeDeviceState: () => Observable<HwDeviceState>;
  close: () => Promise<void>;
}

export interface IHwControl {
  observePacket(): Observable<Uint8Array>;

  // 연결이 되었을 때 자동으로 호출되는 함수
  onBeforeClose(ctx: any): Promise<void>;

  // 연결 끊어졌을 때 자동으로 호출되는 함수
  onAfterOpen(ctx: any): Promise<void>;
}

export interface IHw {
  hwId: string;

  hwKind: 'serial' | 'etc';

  // openDevice: (opts: any) => Promise<IDevice>
  createControl: (ctx: any) => IHwControl;
}

export interface IHwEmul {
  connect: (hwId: string) => Promise<any>;

  waitUntilConnected: () => Promise<any>;

  isConnected: () => boolean;

  observeHwNotifications: (
    ctx: any,
    type: string,
    periId: string,
    intervalMs: number,
    eventName?: string,
  ) => Observable<IHcpHwNotification>;

  observeHwNotificationsDistinct: (
    ctx: any, // routine
    type: string,
    periId: string,
    eventName: string, // // eventName=button__onChange
    value?: any,
  ) => Observable<IHcpHwNotification>;

  getLastPeriValue: (
    ctx: any,
    periId: string,
    eventName?: string,
    valueKey?: string,
  ) => Promise<any>;

  runCmd: (emulCtx: any, hwId: string, cmd: string, ...args: unknown[]) => Promise<any>;

  onEmulStart: () => Promise<void>;

  onEmulStop: () => Promise<void>;

  onEmulDestroyed: () => Promise<void>;
}

/**
 * 하드웨어 전송 프로토콜
 * legacy: socketio기반으로 기존에 통신하던 방식
 * hcp: 20220901 하드웨어 제어를 위해 개발한 웹소켓 기반의 통신방식
 */
export type HwTransportProto = 'legacy' | 'hcp';

/**
 * 하드웨어 연결 모드
 * net: 연결 프로그램을 이용하는 방식
 * iframe: IFRAME을 이용하는 방식
 */
export type HwConnModeKey = 'net' | 'webSerial' | 'iframe';

export const HwConnMode: Record<HwConnModeKey, string> = {
  net: '연결 프로그램',
  webSerial: '웹시리얼',
  iframe: 'IFRAME',
};
