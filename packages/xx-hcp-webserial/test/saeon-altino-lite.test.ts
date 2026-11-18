// SaeonAltinoLite 파서와 Control의 현재 동작을 고정하는 특성화 테스트.
// 장치는 가짜 WebSerialDevice로 대체하고, 전송 바이트는 가짜 write로 관찰한다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaeonAltinoLiteControl } from '../src/hw/saeonAltinoLite/SaeonAltinoLiteControl';
import { SaeonAltinoLiteParser } from '../src/hw/saeonAltinoLite/SaeonAltinoLiteParser';
import { NOTE_SCALE } from '../src/hw/saeonAltinoLite/saeon-altino-lite-utils';
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

/** 파서 입력을 모아 두는 도우미. 22바이트 패킷, 시작 0x02, 종료 0x03이다. */
function createParser() {
  const packets: number[][] = [];
  const parser = new SaeonAltinoLiteParser({ startMark: 2, endMark: 3, packetLength: 22 }, (it) =>
    packets.push(Array.from(it)),
  );
  return { parser, packets };
}

describe('SaeonAltinoLiteParser 패킷 분리', () => {
  it('시작 마크 앞의 잡음을 버리고, 청크 경계와 무관하게 22바이트 패킷을 내보낸다', () => {
    const { parser, packets } = createParser();
    // 22바이트 안쪽의 0x03은 종료 마크로 보지 않고, 체크섬도 검증하지 않는다.
    const packet = [2, 10, 11, 12, 13, 3, ...Array(15).fill(7), 3];
    expect(packet).toHaveLength(22);

    parser.enqueue(new Uint8Array([9, 9, ...packet.slice(0, 5)]));
    expect(packets).toEqual([]);
    parser.enqueue(new Uint8Array(packet.slice(5)));

    expect(packets).toEqual([packet]);
  });

  it('종료 마크가 어긋나면 안쪽 시작 마크부터 버퍼를 맞춰 이어 간다', () => {
    const { parser, packets } = createParser();
    // 22번째 바이트가 7이라 종료 마크 불일치. 5번 위치의 안쪽 0x02부터 다시 시작한다.
    parser.enqueue(new Uint8Array([2, 0, 0, 0, 0, 2, ...Array(16).fill(7)]));
    expect(packets).toEqual([]);

    parser.enqueue(new Uint8Array([8, 8, 8, 8, 3]));

    expect(packets).toEqual([[2, ...Array(16).fill(7), 8, 8, 8, 8, 3]]);
  });

  it('종료 마크가 어긋나고 안쪽 시작 마크가 없으면 버리고 다음 패킷을 기다린다', () => {
    const { parser, packets } = createParser();
    parser.enqueue(new Uint8Array([2, ...Array(20).fill(5), 9]));
    expect(packets).toEqual([]);

    const next = [2, ...Array(20).fill(6), 3];
    parser.enqueue(new Uint8Array(next));

    expect(packets).toEqual([next]);
  });

  it('생성 직후 중개 버퍼는 길이 1짜리 [0]이다(원본이 packetLength를 대입 전에 읽은 결과)', () => {
    const { parser } = createParser();

    expect((parser as unknown as { buffer: number[] }).buffer).toEqual([0]);
  });
});

describe('SaeonAltinoLiteParser.parse', () => {
  it('upstream 바이트를 패킷으로 묶어 내보내고, 구독 해제하면 upstream 구독도 해제한다', () => {
    const upstream = new Subject<Uint8Array>();
    const received: number[][] = [];
    const subscription = upstream
      .pipe(SaeonAltinoLiteParser.parse())
      .subscribe((it) => received.push(Array.from(it)));
    const packet = [2, ...Array(20).fill(1), 3];

    upstream.next(new Uint8Array(packet));
    expect(received).toEqual([packet]);
    expect(upstream.observed).toBe(true);

    subscription.unsubscribe();
    expect(upstream.observed).toBe(false);
  });

  it('upstream이 완료돼도 downstream은 완료되지 않고 오류가 비동기로 던져진다(subscriber.complete를 this 없이 넘긴 결과)', () => {
    vi.useFakeTimers();
    const upstream = new Subject<Uint8Array>();
    const onComplete = vi.fn();
    upstream.pipe(SaeonAltinoLiteParser.parse()).subscribe({ complete: onComplete });

    upstream.complete();

    expect(onComplete).not.toHaveBeenCalled();
    expect(() => vi.runAllTimers()).toThrow(TypeError);
  });
});

describe('saeon-altino-lite-utils', () => {
  it("NOTE_SCALE에는 'F (Fa#)' 키가 'F# (Fa#)'와 같은 값 7로 중복돼 있다", () => {
    expect(NOTE_SCALE['F (Fa#)']).toBe(NOTE_SCALE['F# (Fa#)']);
    expect(NOTE_SCALE['F (Fa#)']).toBe(7);
  });
});

/**
 * Control이 쓰는 모듈 수준 output은 인스턴스 사이에 공유되므로,
 * 매 테스트 시작에 stop('All')로 정지 상태로 되돌린다.
 */
async function createControl() {
  const fake = createHwFakeDevice();
  const control = new SaeonAltinoLiteControl(fake.device);
  await control.stop({}, 'All');
  return { fake, control };
}

/** 현재 output을 프레임으로 만들어 쓰게 하고, 마지막으로 쓴 22바이트를 돌려준다. */
async function nextFrame(
  control: SaeonAltinoLiteControl,
  fake: ReturnType<typeof createHwFakeDevice>,
) {
  const writeOutput = (
    control as unknown as {
      writeOutput_: (tag: string, device: unknown) => Promise<void>;
    }
  ).writeOutput_;
  await writeOutput('test', fake.device);
  const all = fake.written();
  return all[all.length - 1];
}

describe('SaeonAltinoLiteControl 전송 프레임', () => {
  it('정지 상태의 기본 프레임은 시작 02, 길이 16, 체크섬 2, 종료 03이다', async () => {
    const { fake, control } = await createControl();

    const frame = await nextFrame(control, fake);

    expect(frame).toEqual([2, 16, 2, 1, 1, ...Array(16).fill(0), 3]);
  });

  it('go는 -1000~1000으로 자르고 바퀴 값을 16비트 보수 상위/하위 바이트로 쓴다', async () => {
    const { fake, control } = await createControl();
    await control.go({}, 300, -500);

    const frame = await nextFrame(control, fake);

    // RM=-500 -> 0xFE0C, LM=300 -> 0x012C. 체크섬은 3~20번 합(313)의 하위 8비트다.
    expect(frame).toEqual([2, 16, 57, 1, 1, 0, 254, 12, 1, 44, ...Array(11).fill(0), 3]);

    await control.go({}, 5000, -5000);
    const clamped = await nextFrame(control, fake);
    expect(clamped.slice(6, 10)).toEqual([0xfc, 0x18, 0x03, 0xe8]);
  });

  it('steering은 표에 있는 옵션만 반영하고 음수는 Uint8Array 변환으로 2의 보수가 된다', async () => {
    const { fake, control } = await createControl();

    await control.steering({}, 'Left-10');
    const left = await nextFrame(control, fake);
    // STR=-63 -> 193. 체크섬은 1+1-63=-61의 하위 8비트(195)다.
    expect(left[5]).toBe(193);
    expect(left[2]).toBe(195);

    await control.steering({}, 'Left-7');
    const invalid = await nextFrame(control, fake);
    expect(invalid[5]).toBe(193);

    await control.steeringNumber({}, 500);
    const clamped = await nextFrame(control, fake);
    expect(clamped[5]).toBe(127);
  });

  it('light·lightHex·sound는 각각 LED(20번)와 NOTE(19번)에 반영한다', async () => {
    const { fake, control } = await createControl();

    await control.light({}, 'Brake', 'On');
    await control.light({}, 'Turn left', 'On');
    expect((await nextFrame(control, fake))[20]).toBe(0x06);

    await control.light({}, 'Brake', 'Off');
    expect((await nextFrame(control, fake))[20]).toBe(0x04);

    await control.lightHex({}, 0x1ff);
    // 마스크 없이 대입하므로 프레임에는 하위 8비트만 실린다.
    expect((await nextFrame(control, fake))[20]).toBe(0xff);

    await control.sound({}, '4-Oct', 'C (Do)');
    expect((await nextFrame(control, fake))[19]).toBe(37);

    await control.sound({}, '9-Oct', 'C (Do)');
    await control.sound({}, '4-Oct', 'Z');
    expect((await nextFrame(control, fake))[19]).toBe(37);

    await control.sound({}, '4-Oct', 'Non');
    expect((await nextFrame(control, fake))[19]).toBe(0);

    await control.soundNumber({}, 97);
    expect((await nextFrame(control, fake))[19]).toBe(0);
    await control.soundNumber({}, 96);
    expect((await nextFrame(control, fake))[19]).toBe(96);
  });

  it('displayChar는 문자 코드를, 도트 매트릭스 명령은 10번을 0xFF로 바꿔 ASCII 모드를 끈다', async () => {
    const { fake, control } = await createControl();

    await control.displayChar({}, 'A');
    expect((await nextFrame(control, fake))[10]).toBe(65);

    await control.displayChar({}, '');
    expect((await nextFrame(control, fake))[10]).toBe(65);

    // bit0 -> DM8, bit7 -> DM1 순서로 채워진다. 프레임은 DM1(11번)부터 DM8(18번)이다.
    await control.displayLine({}, 'Line-2', 'On', 'On', 'Off', 'Off', 'Off', 'Off', 'Off', 'Off');
    const line = await nextFrame(control, fake);
    expect(line[10]).toBe(0xff);
    expect(line.slice(11, 19)).toEqual([0, 0, 0, 0, 0, 0, 2, 2]);

    // 잘못된 줄 이름은 ASCII 모드만 끄고 도트는 그대로 둔다.
    await control.displayChar({}, 'B');
    await control.displayLine({}, 'Line-9', 'On', 'On', 'On', 'On', 'On', 'On', 'On', 'On');
    const invalidLine = await nextFrame(control, fake);
    expect(invalidLine[10]).toBe(0xff);
    expect(invalidLine.slice(11, 19)).toEqual([0, 0, 0, 0, 0, 0, 2, 2]);

    await control.display_on({}, 1, 3);
    await control.display_on({}, 9, 3);
    await control.display_off({}, 1, 2);
    const dots = await nextFrame(control, fake);
    // x=1은 DM8(18번)이다. 범위 밖 x=9는 무시하고, y=2 비트를 끈다.
    expect(dots.slice(11, 19)).toEqual([0, 0, 0, 0, 0, 0, 2, 4]);
  });
});

describe('SaeonAltinoLiteControl 센서', () => {
  it('sensor는 없는 이름이면 0을 돌려준다', async () => {
    const { control } = await createControl();

    expect(await control.sensor({}, 'NOPE')).toBe(0);
  });

  it('수신 패킷에서 IR1~IR6·CDS·BAT를 상위·하위 바이트 순서로 읽는다', async () => {
    const { control } = await createControl();
    const pkt = new Uint8Array(22);
    pkt[0] = 2;
    pkt[21] = 3;
    // IR1~IR6은 5,7,9,11,13,15번, CDS는 17번, BAT는 19번에서 시작하는 16비트 값이다.
    const values = [0x0102, 0x0304, 0x0506, 0x0708, 0x090a, 0x0b0c, 0x0d0e, 0x0210];
    values.forEach((value, i) => {
      pkt[5 + i * 2] = value >> 8;
      pkt[6 + i * 2] = value & 0xff;
    });

    const handle = (
      control as unknown as {
        handleRxPacket_: (tag: string, pkt: Uint8Array) => Promise<void>;
      }
    ).handleRxPacket_;
    await handle('test', pkt);

    const read = async (name: string) => control.sensor({}, name);
    expect([
      await read('IR1'),
      await read('IR2'),
      await read('IR3'),
      await read('IR4'),
      await read('IR5'),
      await read('IR6'),
      await read('CDS'),
      await read('BAT'),
    ]).toEqual(values);
  });

  it('길이가 모자라거나 시작·종료 마크가 틀린 패킷은 센서를 바꾸지 않는다', async () => {
    const { control } = await createControl();
    const handle = (
      control as unknown as {
        handleRxPacket_: (tag: string, pkt: Uint8Array) => Promise<void>;
      }
    ).handleRxPacket_;
    const valid = new Uint8Array(22);
    valid[0] = 2;
    valid[21] = 3;
    valid[5] = 1;
    valid[6] = 1;
    await handle('test', valid);
    expect(await control.sensor({}, 'IR1')).toBe(257);

    const short = new Uint8Array(21);
    const badMark = new Uint8Array(22);
    badMark[0] = 9;
    badMark[21] = 3;
    await handle('test', short);
    await handle('test', badMark);

    expect(await control.sensor({}, 'IR1')).toBe(257);
  });
});

describe('SaeonAltinoLiteControl 열기·닫기', () => {
  it('열면 50ms마다 프레임을 쓰고, 닫으면 정지 프레임 2개를 보낸 뒤 더는 쓰지 않는다', async () => {
    vi.useFakeTimers();
    const { fake, control } = await createControl();
    await control.onAfterOpen({});
    await control.go({}, 100, 100);

    await vi.advanceTimersByTimeAsync(49);
    expect(fake.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.written()).toHaveLength(1);
    expect(fake.written()[0].slice(6, 10)).toEqual([0, 100, 0, 100]);

    const closing = control.onBeforeClose({});
    await vi.advanceTimersByTimeAsync(50);
    await closing;

    const stopFrame = [2, 16, 2, 1, 1, ...Array(16).fill(0), 3];
    expect(fake.written().slice(1)).toEqual([stopFrame, stopFrame]);

    await vi.advanceTimersByTimeAsync(500);
    expect(fake.written()).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });
});
