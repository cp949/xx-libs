// 인터페이스 패키지의 런타임 계약을 고정하는 특성화 테스트.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { describe, expect, it } from 'vitest';
import {
  createHwEnvFilterFn,
  createHwFilterFn,
  DEFAULT_SERIAL_OPTIONS,
  HcpNotificationEvent,
  HwConnMode,
  type Hardware,
  type IHcpNotification,
  type IHwConnEnv,
} from '../src/index.js';

const env = (overrides: Partial<IHwConnEnv> = {}): IHwConnEnv => ({
  isChromeOS: false,
  isCodingpack: false,
  isMobile: false,
  isAndroid: false,
  isIOS: false,
  isDesktop: true,
  isWindows: false,
  isMacOs: false,
  ...overrides,
});

const hw = (overrides: Partial<Hardware> = {}): Hardware => ({
  hwId: 'h',
  kind: 'serial',
  hwName: 'h',
  shortHwName: 'h',
  blockPrefix: '',
  supportDesktop: false,
  supportChromeOS: false,
  supportIOS: false,
  supportAndroid: false,
  supportKodinypack: false,
  ...overrides,
});

describe('HcpNotificationEvent', () => {
  it('send한 알림을 observe가 모두 받고, observeHwNotification은 type이 firmata-value인 것만 받는다', () => {
    const all: IHcpNotification[] = [];
    const hwOnly: IHcpNotification[] = [];
    const s1 = HcpNotificationEvent.observe().subscribe((it) => all.push(it));
    const s2 = HcpNotificationEvent.observeHwNotification().subscribe((it) => hwOnly.push(it));

    const firmata = {
      type: 'firmata-value',
      kind: 'button',
      periId: 'button:8',
      eventName: 'e',
      value: 1,
    };
    const other = { type: 'other' };
    HcpNotificationEvent.send(firmata);
    HcpNotificationEvent.send(other);
    s1.unsubscribe();
    s2.unsubscribe();

    expect(all).toEqual([firmata, other]);
    expect(hwOnly).toEqual([firmata]);
  });

  it('구독하기 전에 보낸 알림은 받지 못한다', () => {
    HcpNotificationEvent.send({ type: 'firmata-value' });
    const received: IHcpNotification[] = [];
    const sub = HcpNotificationEvent.observe().subscribe((it) => received.push(it));
    sub.unsubscribe();

    expect(received).toEqual([]);
  });
});

describe('createHwEnvFilterFn', () => {
  it('isCodingpack이면 supportKodinypack만 본다. 다른 환경 플래그보다 우선한다', () => {
    const filter = createHwEnvFilterFn(env({ isCodingpack: true, isChromeOS: true }));

    expect(filter(hw({ supportKodinypack: true, supportChromeOS: false }))).toBe(true);
    expect(filter(hw({ supportKodinypack: false, supportChromeOS: true }))).toBe(false);
  });

  it('isChromeOS, isAndroid, isIOS 순서로 해당 지원 필드를 보고, 모두 아니면 supportDesktop을 본다', () => {
    expect(
      createHwEnvFilterFn(env({ isChromeOS: true, isAndroid: true }))(
        hw({ supportChromeOS: true }),
      ),
    ).toBe(true);
    expect(
      createHwEnvFilterFn(env({ isAndroid: true, isIOS: true }))(hw({ supportAndroid: true })),
    ).toBe(true);
    expect(createHwEnvFilterFn(env({ isIOS: true }))(hw({ supportIOS: true }))).toBe(true);
    expect(createHwEnvFilterFn(env())(hw({ supportDesktop: true }))).toBe(true);
    expect(createHwEnvFilterFn(env())(hw({ supportIOS: true }))).toBe(false);
  });
});

describe('createHwFilterFn', () => {
  it('추가 필터가 없으면 환경 필터와 같고, 있으면 둘 다 통과해야 한다', () => {
    const desktopOnly = createHwFilterFn(env());
    const withExtra = createHwFilterFn(env(), (it) => it.kind === 'serial');

    expect(desktopOnly(hw({ supportDesktop: true, kind: 'ble' }))).toBe(true);
    expect(withExtra(hw({ supportDesktop: true, kind: 'ble' }))).toBe(false);
    expect(withExtra(hw({ supportDesktop: false, kind: 'serial' }))).toBe(false);
    expect(withExtra(hw({ supportDesktop: true, kind: 'serial' }))).toBe(true);
  });
});

describe('상수', () => {
  it('HwConnMode는 연결 모드 키마다 표시 이름을 갖는다', () => {
    expect(HwConnMode).toEqual({ net: '연결 프로그램', webSerial: '웹시리얼', iframe: 'IFRAME' });
  });

  it('DEFAULT_SERIAL_OPTIONS는 baudRate를 뺀 기본 시리얼 옵션이다', () => {
    expect(DEFAULT_SERIAL_OPTIONS).toEqual({
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
      bufferSize: 255,
    });
  });
});
