// SaeonAl 파서와 Control의 현재 동작을 고정하는 특성화 테스트.
// 장치는 가짜 WebSerialDevice로 대체하고, 전송 바이트는 가짜 write로 관찰한다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaeonAlControl } from '../src/hw/saeonAl/SaeonAlControl';
import { SaeonAlParser } from '../src/hw/saeonAl/SaeonAlParser';
import { AlOutput, NOTE_SCALE } from '../src/hw/saeonAl/saeon-al-utils';
import { createHwFakeDevice } from './hw-fakes';

beforeEach(() => {
  // 원본이 console.log를 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** 56바이트 패킷. 시작 0x02, 종료 0x03이고 사이는 fill 값으로 채운다. */
function makePacket(fill: number, end = 3): number[] {
  return [2, ...Array(54).fill(fill), end];
}

describe('SaeonAlParser 패킷 분리', () => {
  it('시작 마크 앞의 잡음을 버리고, 청크 경계와 무관하게 56바이트 패킷을 내보낸다', () => {
    const upstream = new Subject<Uint8Array>();
    const received: number[][] = [];
    upstream.pipe(SaeonAlParser.parse()).subscribe((it) => received.push(Array.from(it)));
    const packet = makePacket(7);

    upstream.next(new Uint8Array([9, 9, ...packet.slice(0, 30)]));
    expect(received).toEqual([]);
    upstream.next(new Uint8Array(packet.slice(30)));

    expect(received).toEqual([packet]);
  });

  it('종료 마크가 어긋난 56바이트는 내보내지 않고, 이어 오는 정상 패킷은 내보낸다', () => {
    const upstream = new Subject<Uint8Array>();
    const received: number[][] = [];
    upstream.pipe(SaeonAlParser.parse()).subscribe((it) => received.push(Array.from(it)));

    upstream.next(new Uint8Array(makePacket(5, 9)));
    expect(received).toEqual([]);

    const next = makePacket(6);
    upstream.next(new Uint8Array(next));
    expect(received).toEqual([next]);
  });

  it('upstream이 오류를 내도 downstream에 전달되지 않고 오류가 비동기로 던져진다(subscriber.error를 this 없이 넘긴 결과)', () => {
    vi.useFakeTimers();
    const upstream = new Subject<Uint8Array>();
    const onError = vi.fn();
    upstream.pipe(SaeonAlParser.parse()).subscribe({ error: onError });

    upstream.error(new Error('boom'));

    expect(onError).not.toHaveBeenCalled();
    expect(() => vi.runAllTimers()).toThrow(TypeError);
  });
});

describe('saeon-al-utils', () => {
  it("NOTE_SCALE에는 'F (Fa#)' 키가 'F# (Fa#)'와 같은 값 7로 중복돼 있다", () => {
    expect(NOTE_SCALE['F (Fa#)']).toBe(NOTE_SCALE['F# (Fa#)']);
    expect(NOTE_SCALE['F (Fa#)']).toBe(7);
  });

  it('AlOutput.updateForStopAll은 IRO_BREAK의 하위 4비트만 남기고 나머지는 0으로 만든다', () => {
    const out = new AlOutput();
    expect(out.IRO_BREAK).toBe(10);
    out.IRO_BREAK = 0xcf;
    out.RM_H = 5;
    out.LED = 9;

    out.updateForStopAll();

    expect(out.IRO_BREAK).toBe(0x0f);
    expect(out.RM_H).toBe(0);
    expect(out.LED).toBe(0);
  });
});

/**
 * Control이 쓰는 모듈 수준 output은 인스턴스 사이에 공유되므로,
 * 매 테스트 시작에 stop('All')로 정지 상태로 되돌린다.
 */
async function createControl() {
  const fake = createHwFakeDevice();
  const control = new SaeonAlControl(fake.device);
  await control.stop({}, 'All');
  return { fake, control };
}

type Fake = ReturnType<typeof createHwFakeDevice>;

/** 현재 output을 프레임으로 만들어 쓰게 하고, 마지막으로 쓴 28바이트를 돌려준다. */
async function nextFrame(control: SaeonAlControl, fake: Fake) {
  const writeOutput = (
    control as unknown as { writeOutput_: (tag: string, device: unknown) => Promise<void> }
  ).writeOutput_;
  await writeOutput('test', fake.device);
  const all = fake.written();
  return all[all.length - 1];
}

/** 정지 상태 프레임. 체크섬은 합 307의 하위 8비트(51)가 실린다. */
const STOP_FRAME = [
  2,
  28,
  51,
  0,
  10,
  ...Array(8).fill(0),
  ...Array(8).fill(0),
  10,
  0,
  0,
  1,
  0,
  255,
  3,
];

describe('SaeonAlControl 전송 프레임', () => {
  it('정지 상태의 기본 프레임은 28바이트이고 체크섬은 255를 넘는 합이 하위 8비트로 잘려 실린다', async () => {
    const { fake, control } = await createControl();

    const frame = await nextFrame(control, fake);

    expect(frame).toHaveLength(28);
    expect(frame).toEqual(STOP_FRAME);
  });

  it('go는 속도를 1000으로 자르고 0 이하의 방향은 상위 바이트의 0x80으로 표시한다', async () => {
    const { fake, control } = await createControl();

    await control.go({}, 300, -1500);
    const frame = await nextFrame(control, fake);

    // RM=-1500 -> 1000(0x03E8)에 방향 비트, LM=300 -> 0x012C. 체크섬은 합 715의 하위 8비트(203)다.
    expect(frame.slice(7, 12)).toEqual([0x83, 0xe8, 0, 0x01, 0x2c]);
    expect(frame[2]).toBe(203);

    // 속도 0도 "양수가 아님"으로 보아 방향 비트가 선다.
    await control.go({}, 0, 0);
    const zero = await nextFrame(control, fake);
    expect([zero[7], zero[8], zero[10], zero[11]]).toEqual([0x80, 0, 0x80, 0]);
  });

  it('steering은 Left-/Right- 옵션을 6배 해 0~127로 자르고, 알 수 없는 옵션은 무시한다', async () => {
    const { fake, control } = await createControl();

    await control.steering({}, 'Left-5');
    expect((await nextFrame(control, fake))[5]).toBe(0x80 | 30);

    await control.steering({}, 'Right-30');
    expect((await nextFrame(control, fake))[5]).toBe(127);

    await control.steering({}, 'Diagonal');
    expect((await nextFrame(control, fake))[5]).toBe(127);

    await control.steering({}, 'Center');
    expect((await nextFrame(control, fake))[5]).toBe(0);

    await control.steeringNumber({}, -200);
    expect((await nextFrame(control, fake))[5]).toBe(0x80 | 127);
  });

  it('숫자가 아닌 steering 옵션은 거르지 않는다. Left-abc는 0x80이 되고 Right-abc는 NaN이 돼 프레임 5번과 체크섬이 0으로 실린다', async () => {
    const { fake, control } = await createControl();

    await control.steering({}, 'Left-abc');
    expect((await nextFrame(control, fake))[5]).toBe(0x80);

    await control.steering({}, 'Right-abc');
    const frame = await nextFrame(control, fake);
    expect(frame[5]).toBe(0);
    expect(frame[2]).toBe(0);
  });

  it('light·lightHex는 IRO_BREAK(21번)와 LED(23번)에 반영한다', async () => {
    const { fake, control } = await createControl();

    await control.light({}, 'Brake', 'On');
    await control.light({}, 'Turn left', 'On');
    const on = await nextFrame(control, fake);
    expect([on[21], on[23]]).toEqual([0xca, 0xa0]);

    await control.light({}, 'Brake', 'Off');
    expect((await nextFrame(control, fake))[21]).toBe(0x0a);

    // IRO_BREAK는 상위 4비트만 교체하고 LED는 하위 8비트만 쓴다.
    await control.lightHex({}, 0xf5, 0x1ff);
    const hex = await nextFrame(control, fake);
    expect([hex[21], hex[23]]).toEqual([0xfa, 0xff]);
  });

  it('sound는 옥타브·음 이름으로 BZR(22번)을 정하고, 잘못된 옵션과 범위 밖 번호는 무시한다', async () => {
    const { fake, control } = await createControl();

    await control.sound({}, '4-Oct', 'C (Do)');
    expect((await nextFrame(control, fake))[22]).toBe(37);

    await control.sound({}, '9-Oct', 'C (Do)');
    await control.sound({}, '4-Oct', 'Z');
    expect((await nextFrame(control, fake))[22]).toBe(37);

    await control.sound({}, '4-Oct', 'Non');
    expect((await nextFrame(control, fake))[22]).toBe(0);

    await control.soundNumber({}, 97);
    expect((await nextFrame(control, fake))[22]).toBe(0);
    await control.soundNumber({}, 96);
    expect((await nextFrame(control, fake))[22]).toBe(96);
  });

  it('displayChar는 문자 코드에 0x80을 더해 DMC(12번)에 쓰고, 도트 명령은 DMC를 0으로 되돌린다', async () => {
    const { fake, control } = await createControl();

    await control.displayChar({}, 'A');
    expect((await nextFrame(control, fake))[12]).toBe(65 | 0x80);

    await control.displayChar({}, '');
    expect((await nextFrame(control, fake))[12]).toBe(65 | 0x80);

    // bit0 -> DM8, bit7 -> DM1 순서로 채워진다. 프레임은 DM1(13번)부터 DM8(20번)이다.
    await control.displayLine({}, 'Line-2', 'On', 'On', 'Off', 'Off', 'Off', 'Off', 'Off', 'Off');
    const line = await nextFrame(control, fake);
    expect(line[12]).toBe(0);
    expect(line.slice(13, 21)).toEqual([0, 0, 0, 0, 0, 0, 2, 2]);

    // 잘못된 줄 이름은 DMC만 0으로 만들고 도트는 그대로 둔다.
    await control.displayLine({}, 'Line-9', 'On', 'On', 'On', 'On', 'On', 'On', 'On', 'On');
    expect((await nextFrame(control, fake)).slice(13, 21)).toEqual([0, 0, 0, 0, 0, 0, 2, 2]);
  });

  it('display_off는 DMC를 지우지 않고, display_on은 지운다(원본은 display_off에서 txBytes[12]만 0으로 만들어 프레임 갱신 때 덮어쓰인다)', async () => {
    const { fake, control } = await createControl();
    await control.displayChar({}, 'A');

    await control.display_off({}, 1, 1);
    expect((await nextFrame(control, fake))[12]).toBe(65 | 0x80);

    await control.display_on({}, 1, 2);
    await control.display_on({}, 9, 2);
    const frame = await nextFrame(control, fake);
    // x=1은 DM8(20번)이다. 범위 밖 x=9는 무시한다.
    expect(frame[12]).toBe(0);
    expect(frame.slice(13, 21)).toEqual([0, 0, 0, 0, 0, 0, 0, 2]);
  });
});

describe('SaeonAlControl 센서', () => {
  it('sensor는 없는 이름이면 0을 돌려준다', async () => {
    const { control } = await createControl();

    expect(await control.sensor({}, 'NOPE')).toBe(0);
  });

  const handleRxPacket = (control: SaeonAlControl) =>
    (control as unknown as { handleRxPacket_: (tag: string, pkt: Uint8Array) => Promise<void> })
      .handleRxPacket_;

  it('길이가 모자라거나 시작·종료 마크가 틀린 패킷은 던지지 않고 센서를 바꾸지 않는다', async () => {
    const { control } = await createControl();
    const handle = handleRxPacket(control);
    const short = new Uint8Array(55);
    const badMark = new Uint8Array(56);
    badMark[0] = 9;
    badMark[55] = 3;
    badMark[7] = 1;
    badMark[8] = 1;

    await handle('test', short);
    await handle('test', badMark);

    expect(await control.sensor({}, 'IR1')).toBe(0);
  });

  /** 56바이트 수신 패킷을 만든다. 값은 big endian 2바이트로 채운다. */
  const makeRxPacket = (values: Record<number, number>) => {
    const pkt = new Uint8Array(56);
    pkt[0] = 2;
    pkt[55] = 3;
    for (const [index, value] of Object.entries(values)) {
      pkt[Number(index)] = value >> 8;
      pkt[Number(index) + 1] = value & 0xff;
    }
    return pkt;
  };

  it('정상 패킷은 IR·LMC·CDS·TEMP와 ACC·BAT까지 모든 센서 값을 갱신한다', async () => {
    const { control } = await createControl();
    const pkt = makeRxPacket({
      7: 0x0102, // IR1
      19: 0x0304, // LMC
      43: 0x0506, // CDS
      25: 0x1234, // ACC_X (12비트 부호 값)
      47: 600, // BAT (ADC 값)
    });

    await expect(handleRxPacket(control)('test', pkt)).resolves.toBeUndefined();

    const read = (name: string) => control.sensor({}, name);
    expect([await read('IR1'), await read('LMC'), await read('CDS'), await read('TEMP')]).toEqual([
      0x0102, 0x0304, 0x0506, 104,
    ]);
    expect([await read('ACC_X'), await read('BAT')]).toEqual([0x123, 40]);
  });

  it('ACC·MAG는 12비트, GYR은 16비트 부호 값으로 읽고 배터리는 0~100으로 자른다', async () => {
    const { control } = await createControl();
    const handle = handleRxPacket(control);
    const read = (name: string) => control.sensor({}, name);

    // 0xfff0은 12비트로 읽으면 -1, 16비트로 읽으면 -16이다.
    await handle('test', makeRxPacket({ 25: 0xfff0, 31: 0x1234, 37: 0xfff0, 39: 0x1234, 47: 0 }));
    expect([
      await read('ACC_X'),
      await read('MAG_X'),
      await read('GYR_X'),
      await read('GYR_Y'),
    ]).toEqual([-1, 0x123, -16, 0x1234]);
    expect(await read('BAT')).toBe(0);

    // 전압 = 0.0027 * adc + 5.8958. 7V 미만은 0, 8.3V 초과는 100이다.
    await handle('test', makeRxPacket({ 47: 1000 }));
    expect(await read('BAT')).toBe(100);
  });
});

describe('SaeonAlControl 열기·닫기', () => {
  it('열면 50ms마다 프레임을 쓰고, 닫으면 정지 프레임 2개를 보낸 뒤 더는 쓰지 않는다', async () => {
    vi.useFakeTimers();
    const { fake, control } = await createControl();
    await control.onAfterOpen({});
    await control.go({}, 100, 100);

    await vi.advanceTimersByTimeAsync(49);
    expect(fake.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.written()).toHaveLength(1);
    expect(fake.written()[0].slice(7, 12)).toEqual([0, 100, 0, 0, 100]);

    const closing = control.onBeforeClose({});
    await vi.advanceTimersByTimeAsync(50);
    await closing;

    expect(fake.written().slice(1)).toEqual([STOP_FRAME, STOP_FRAME]);

    await vi.advanceTimersByTimeAsync(500);
    expect(fake.written()).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });
});
