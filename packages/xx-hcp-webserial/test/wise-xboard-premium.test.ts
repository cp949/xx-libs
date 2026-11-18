// WiseXboardPremiumControl의 패킷 구성과 파싱을 고정하는 특성화 테스트.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiseXboardPremiumControl } from '../src/hw/wiseXboardPremium/WiseXboardPremiumControl';
import { createFakeDevice } from './core-fakes';

// 수신 패킷 구분자. 앞의 8바이트(pin1~pin7, 체크섬)가 본문이다.
const DELIMITER = [0x23, 0x08, 0x00];

// 본문 7바이트에 XOR 체크섬을 붙여 구분자까지 완성한 raw 바이트열
const rawPacket = (pins: number[]) => {
  const checksum = pins.reduce((acc, cur) => acc ^ cur, 0);
  return [...pins, checksum, ...DELIMITER];
};

let fake: ReturnType<typeof createFakeDevice>;
let control: WiseXboardPremiumControl;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  // DEBUG 로그와 경고를 막는다.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  fake = createFakeDevice();
  control = new WiseXboardPremiumControl(fake.device);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// read가 구독한 뒤 시각을 1ms 흘리고 raw 바이트를 흘려 보낸다.
const readWith = async <T>(read: () => Promise<T>, raw: number[]): Promise<T> => {
  const pending = read();
  vi.advanceTimersByTime(1);
  fake.raw$.next({ timestamp: 0, dataBuffer: new Uint8Array(raw) });
  return pending;
};

describe('WiseXboardPremiumControl 쓰기 패킷', () => {
  it('모든 패킷은 0x23으로 시작하고 마지막 바이트가 체크섬이다. 체크섬은 byte[2]부터 체크섬 앞까지의 XOR이다', async () => {
    await control.setDCMotorSpeedP({}, 50, -50, -100, 200);
    await control.stopDCMotorP({});
    await control.sendKeyP(5);

    expect(fake.written()).toEqual([
      // l1=50, r1=-50, l2=-100, r2는 100으로 맞춘다. 음수는 256 보수다.
      [0x23, 5, 0x82, 50, 206, 156, 100, 134],
      [0x23, 1, 0x83, 0x83],
      [0x23, 2, 0x84, 5, 0x81],
    ]);
  });

  it('모터 1과 모터 2는 서로 다른 명령 바이트로 보낸다', async () => {
    await control.setDCMotor1SpeedP({}, 50, -50);
    await control.setDCMotor2SpeedP({}, -100, 100);

    expect(fake.written()).toEqual([
      [0x23, 3, 0x85, 50, 206, 121],
      [0x23, 3, 0x86, 156, 100, 126],
    ]);
  });

  it('setServoMotorAngleP는 핀을 3~6으로, 각도를 -90~90으로 맞추고 속도는 20으로 고정한다', async () => {
    await control.setServoMotorAngleP({}, 1, -90);

    // 음수 각도는 255에서 뺀다(-90 -> 165).
    expect(fake.written()).toEqual([[0x23, 4, 0x81, 3, 165, 20, 51]]);
  });

  it('digitalWriteP는 핀을 0~5로, 값을 0 또는 1로 맞춘다', async () => {
    await control.digitalWriteP({}, 9, 7);

    expect(fake.written()).toEqual([[0x23, 3, 0x80, 5, 1, 132]]);
  });
});

describe('WiseXboardPremiumControl 읽기', () => {
  it('체크섬이 맞는 패킷에서 analogReadP, readRemoconP, digitalReadP 값을 꺼낸다', async () => {
    const raw = rawPacket([10, 101, 100, 0, 0, 0, 77]);

    expect(await readWith(() => control.analogReadP({}, 2), raw)).toBe(101);
    expect(await readWith(() => control.readRemoconP({}), raw)).toBe(77);
    // 100을 초과해야 1이다.
    expect(await readWith(() => control.digitalReadP({}, 2), raw)).toBe(1);
    expect(await readWith(() => control.digitalReadP({}, 3), raw)).toBe(0);
  });

  it('본문이 8바이트보다 길어도 앞 8바이트의 체크섬이 맞으면 받아들인다', async () => {
    const raw = [1, 2, 3, 4, 5, 6, 7, 1 ^ 2 ^ 3 ^ 4 ^ 5 ^ 6 ^ 7, 99, ...DELIMITER];

    expect(await readWith(() => control.analogReadP({}, 7), raw)).toBe(7);
  });

  it('체크섬이 틀리거나 8바이트보다 짧으면 던지지 않고 재시도 없이 0을 돌려준다', async () => {
    // 재시도 의도(remainCount=2)와 달리 루프가 한 번만 돌아서 두 번째 패킷을 기다리지 않는다.
    const badChecksum = [1, 2, 3, 4, 5, 6, 7, 9, ...DELIMITER];
    const tooShort = [1, 2, 3, ...DELIMITER];

    expect(await readWith(() => control.analogReadP({}, 1), badChecksum)).toBe(0);
    expect(await readWith(() => control.readRemoconP({}), tooShort)).toBe(0);
  });
});

describe('WiseXboardPremiumControl onBeforeClose', () => {
  it('모터를 멈추고 핀 0~6에 0을 쓴다. 핀은 5까지만 가므로 마지막 두 패킷이 같다', async () => {
    await control.onBeforeClose({});

    expect(fake.written()).toEqual([
      [0x23, 1, 0x83, 0x83],
      [0x23, 3, 0x80, 0, 0, 0x80],
      [0x23, 3, 0x80, 1, 0, 0x81],
      [0x23, 3, 0x80, 2, 0, 0x82],
      [0x23, 3, 0x80, 3, 0, 0x83],
      [0x23, 3, 0x80, 4, 0, 0x84],
      [0x23, 3, 0x80, 5, 0, 0x85],
      [0x23, 3, 0x80, 5, 0, 0x85],
    ]);
  });

  it('device.isOpened는 함수 참조라 항상 참으로 평가되어 닫힌 장치에도 쓰기를 시도한다', async () => {
    fake = createFakeDevice(false);
    control = new WiseXboardPremiumControl(fake.device);

    await control.onBeforeClose({});

    expect(fake.write).toHaveBeenCalledTimes(8);
  });

  it('쓰기가 실패해도 예외를 삼킨다. LED 반복은 첫 실패에서 중단된다', async () => {
    fake.write.mockRejectedValue(new Error('write failed'));

    await expect(control.onBeforeClose({})).resolves.toBeUndefined();

    // stopDCMotorP 1회와 첫 digitalWriteP 1회에서 각각 실패한다.
    expect(fake.write).toHaveBeenCalledTimes(2);
  });
});
