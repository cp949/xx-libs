// WiseXboardControl의 패킷 구성과 파싱을 고정하는 특성화 테스트.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WiseXboardControl } from '../src/hw/wiseXboard/WiseXboardControl';
import { createFakeDevice } from './core-fakes';

const X = 0x58;
const R = 0x52;
const S = 0x53;
// 수신 패킷 구분자. 앞의 5바이트가 pin1~pin5 값이다.
const DELIMITER = [0x52, 0x58, 0x3d, 0x00, 0x0e];

// 모터 실행 패킷(MRTEXE) 접두. 마지막 두 바이트(100, 체크섬) 앞이다.
const mrtexe = (index: number, checksum: number) => [
  0xff,
  0xff,
  0x4c,
  0x53,
  0,
  0,
  0,
  0,
  0x30,
  0x0c,
  0x03,
  index,
  0,
  100,
  checksum,
];

let fake: ReturnType<typeof createFakeDevice>;
let control: WiseXboardControl;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  // DEBUG 로그를 막는다.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  fake = createFakeDevice();
  control = new WiseXboardControl(fake.device);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// read가 구독한 뒤 시각을 1ms 흘리고 raw 바이트를 흘려 보낸다.
// readNext_는 호출 시각보다 큰 timestamp의 패킷만 받는다.
const readWith = async <T>(read: () => Promise<T>, raw: number[]): Promise<T> => {
  const pending = read();
  vi.advanceTimersByTime(1);
  fake.raw$.next({ timestamp: 0, dataBuffer: new Uint8Array(raw) });
  return pending;
};

describe('WiseXboardControl 읽기', () => {
  it('analogRead는 구분자 앞 바이트에서 pinNum번째 값을 돌려주고, 범위 밖 핀은 0이다', async () => {
    const raw = [10, 101, 100, 0, 255, ...DELIMITER];

    expect(await readWith(() => control.analogRead({}, 2), raw)).toBe(101);
    expect(await readWith(() => control.analogRead({}, 6), raw)).toBe(0);
  });

  it('digitalRead는 100을 초과해야 1이고 100 이하는 0이다', async () => {
    const raw = [0, 101, 100, 0, 0, ...DELIMITER];

    expect(await readWith(() => control.digitalRead({}, 2), raw)).toBe(1);
    expect(await readWith(() => control.digitalRead({}, 3), raw)).toBe(0);
  });

  it('구분자가 두 번의 raw 수신에 걸쳐도 한 패킷으로 조립한다', async () => {
    const pending = control.analogRead({}, 1);
    vi.advanceTimersByTime(1);
    fake.raw$.next({ timestamp: 0, dataBuffer: new Uint8Array([7, 1, 2, 3, 4, 0x52, 0x58]) });
    fake.raw$.next({ timestamp: 0, dataBuffer: new Uint8Array([0x3d, 0x00, 0x0e]) });

    expect(await pending).toBe(7);
  });
});

describe('WiseXboardControl digitalWrite', () => {
  it('pin번째 바이트에 0 또는 1을 쓰고 value는 양수이면 1로 만든다', async () => {
    await control.digitalWrite({}, 3, 5);
    await control.digitalWrite({}, 1, -1);

    expect(fake.written()).toEqual([
      [X, R, 2, 0, 0, 1, 0, 0, S],
      [X, R, 2, 0, 0, 0, 0, 0, S],
    ]);
  });

  it('핀 범위를 검사하지 않아 pin 0은 명령 바이트(2)를 덮어쓴다', async () => {
    await control.digitalWrite({}, 0, 1);

    expect(fake.written()).toEqual([[X, R, 1, 0, 0, 0, 0, 0, S]]);
  });
});

describe('WiseXboardControl 모터 패킷', () => {
  it('stopDCMotor는 정지 패킷 뒤에 MRTEXE(2) 패킷을 보낸다. 체크섬은 pkt[6..13]의 합이다', async () => {
    await control.stopDCMotor({});

    // 0+0+0x30+0x0c+3+2+0+100 = 165
    expect(fake.written()).toEqual([[X, R, 0, 0, 0, 0, 0, 0, S], mrtexe(2, 165)]);
  });

  it('setHumanoidMotion은 MRTEXE 패킷을 보내고, 체크섬이 255를 넘으면 바이트로 잘린다', async () => {
    await control.setHumanoidMotion({}, 5);
    await control.setHumanoidMotion({}, 100);

    // 163 + index. 263은 Uint8Array 변환에서 7이 된다.
    expect(fake.written()).toEqual([mrtexe(5, 168), mrtexe(100, 7)]);
  });

  it('setDCMotorSpeed는 음수를 256 보수로 바꾸고, 한쪽 방향만 제한한다', async () => {
    await control.setDCMotorSpeed({}, -20, 5, 20, -3);
    await control.setDCMotorSpeed({}, 100, 0, -100, 0);

    expect(fake.written()).toEqual([
      // l1은 -10 미만이 -10으로, l2는 10 초과가 10으로 맞춰진다.
      [X, R, 0, 246, 5, 10, 253, 0, S],
      mrtexe(2, 165),
      // l1의 상한과 l2의 하한은 제한하지 않는다.
      [X, R, 0, 100, 0, 156, 0, 0, S],
      mrtexe(2, 165),
    ]);
  });

  it('setServoMotorAngle은 각도를 -90~90, 핀을 1~5로 맞추고 음수는 255에서 뺀다', async () => {
    await control.setServoMotorAngle({}, 9, -200);

    expect(fake.written()).toEqual([[X, R, 3, 5, 165, 0, 0, 0, S], mrtexe(2, 165)]);
  });
});

describe('WiseXboardControl onBeforeClose', () => {
  it('모터를 멈추고 LED를 끈다', async () => {
    await control.onBeforeClose({});

    expect(fake.written()).toEqual([
      [X, R, 0, 0, 0, 0, 0, 0, S],
      mrtexe(2, 165),
      [X, R, 2, 0, 0, 0, 0, 0, S],
    ]);
  });

  it('쓰기가 실패해도 예외를 삼키고 다음 단계를 시도한다', async () => {
    fake.write.mockRejectedValue(new Error('write failed'));

    await expect(control.onBeforeClose({})).resolves.toBeUndefined();

    // stopDCMotor는 첫 쓰기에서 중단되고, 이어서 digitalWrite를 시도한다.
    expect(fake.write).toHaveBeenCalledTimes(2);
  });
});
