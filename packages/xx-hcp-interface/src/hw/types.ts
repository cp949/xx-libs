/*~ https://wicg.github.io/serial/#dom-serialoptions */
export type HardwareSerialOptions = {
  baudRate: number;
  dataBits?: 7 | 8; // default 8
  stopBits?: 1 | 2; // default 1
  parity?: 'none' | 'even' | 'odd'; // default none
  bufferSize?: number; // default 255
  flowControl?: 'none' | 'hardware'; // default none
};

export interface Hardware {
  /**
   * 하드웨어ID
   */
  hwId: string;

  /**
   * 연결 종류
   */
  kind: 'ble' | 'serial' | 'etc';

  /**
   * 하드웨어 이름
   */
  hwName: string;

  /**
   * 짧은 하드웨어 이름
   */
  shortHwName: string;

  serialOptions?: HardwareSerialOptions;
  packetLengthHint?: number;

  /**
   * 현재 정보가 그룹 정보인가 여부
   * 그룹 정보인경우, 그룹 정보를 통해서는 실제 하드웨어 연결이 불가능합니다.
   * 하나의 하드웨어 그룹에 여러 서브 하드웨어가 존재하는 경우에 사용됩니다.
   * 값을 지정하지 않은 경우 기본값 false입니다.
   *
   * ex) 핑퐁 하드웨어의 경우 그룹형태라서 연결이 불가능
   * pingpong은 연결이 불가능하고, pingpon1,2,3,4로 연결이 가능함
   */
  isGroupInfo?: boolean;

  supportDesktop: boolean;
  supportChromeOS: boolean;
  supportIOS: boolean;
  supportAndroid: boolean;
  supportKodinypack: boolean;

  /**
   * 블록 앞글자
   */
  blockPrefix: string;
}

export interface HardwareIframeInfo extends Hardware {
  /**
   * 연결 URL
   */
  iframeUrl: string;

  /**
   * 로고 이미지
   * iframe내의 이미지 url로 작성
   * ex) awesome-ble/logo.png
   */
  logoUrl: string;

  /**
   * 블록 앞글자
   */
  blockPrefix: string;

  /**
   * 로고 이미지의 CSS 스타일
   * 가로x세로 크기를 설정하기 위해 추가
   */
  logoCss?: any;
}

export interface IHcpPacket {
  channelId(): string;
  proc(): string;
  contentType(): string | null;
  requestId(): string | null;
  hwId(): string | null;
  bodyLength(): number;
  headerOf(headerKey: string): string | null;
  bodyAsJson(): any;
  bodyAsText(): string | null;
  toString(): string;
}

export interface IHcpNotification {
  type: string; // ex: firmata-value
}

export interface IHcpHwNotification extends IHcpNotification {
  kind: string; // ex) button, led ...
  periId: string; // ex) board:0, button:8, led:10
  eventName: string;
  value: any;
}
