// ExMarsCube 큐, 명령 바이트 구성, 수신 패킷 해석의 현재 동작을 고정하는 특성화 테스트.
// 장치는 가짜 WebSerialDevice로 대체하고, 타이머는 가짜 타이머로 진행한다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExMarsCubeControl } from '../src/hw/exMarsCube/ExMarsCubeControl';
import { Queue } from '../src/hw/exMarsCube/queue';
import { Index, PacketType } from '../src/hw/exMarsCube/types';
import { createHwFakeDevice } from './hw-fakes';

beforeEach(() => {
  vi.useFakeTimers();
  // 원본이 console.log를 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Queue', () => {
  it('처음에는 length가 0이지만 내부에 빈 패킷이 하나 있어, 첫 enqueue 뒤 length는 2이고 첫 dequeue는 빈 배열이다', () => {
    const queue = new Queue();
    expect(queue.length).toBe(0);

    queue.enqueue([1, 2]);

    expect(queue.length).toBe(2);
    expect(queue.peek()).toEqual([]);
    expect(queue.dequeue()).toEqual([]);
    expect(queue.dequeue()).toEqual([1, 2]);
    expect(queue.length).toBe(0);
  });

  it('clear하면 빈 패킷도 사라지고, 빈 큐의 dequeue는 빈 배열을 돌려준다', () => {
    const queue = new Queue();
    queue.enqueue([1]);

    queue.clear();
    expect(queue.length).toBe(0);
    queue.enqueue([3]);

    expect(queue.dequeue()).toEqual([3]);
    expect(queue.dequeue()).toEqual([]);
  });
});

describe('ExMarsCube types', () => {
  it('서로 다른 이름이 같은 값을 가진 enum이 있다', () => {
    expect(Index.face).toBe(Index.faceDirection);
    expect(Index.recordResponse).toBe(Index.centerColor);
    expect(Index.sensingRequest).toBe(Index.sensingResponse);
    expect(PacketType.sendByte).toBe(PacketType.received);
  });
});

/** 컨트롤을 열고 sendTimer(20ms)와 receivedTimer(30ms부터 20ms 간격)를 시작한다. */
async function openControl() {
  const fake = createHwFakeDevice();
  const control = new ExMarsCubeControl(fake.device);
  const opening = control.onAfterOpen({});
  await vi.advanceTimersByTimeAsync(10);
  await opening;
  return { fake, control };
}

/** 명령 하나를 보내고, 송신 타이머가 큐를 비울 때까지 진행한 뒤 실제 전송한 패킷만 돌려준다. */
async function sendCommand(
  fake: ReturnType<typeof createHwFakeDevice>,
  command: () => Promise<void>,
) {
  const before = fake.written().length;
  const pending = command();
  await vi.advanceTimersByTimeAsync(20);
  await pending;
  // 틱 3번이면 큐의 빈 패킷과 명령 패킷이 모두 나간다. 5번째 틱(센싱 요청) 전이다.
  await vi.advanceTimersByTimeAsync(40);
  return fake.written().slice(before);
}

describe('ExMarsCubeControl 송신', () => {
  it('송신 타이머는 큐 맨 앞의 빈 패킷을 먼저 쓰고, 5번째 틱에 센싱 요청을 보낸다', async () => {
    const { fake } = await openControl();

    await vi.advanceTimersByTimeAsync(130);

    // 센싱 요청: 인덱스 (7 << 5) | 28 = 252, 파라미터 255 4개, 끝 90.
    expect(fake.written()).toEqual([[], [0, 252, 255, 255, 255, 255, 90]]);
  });

  it.each([
    [
      'setModeSetting',
      (c: ExMarsCubeControl) => c.setModeSetting({}, '3', '4'),
      [0, 0, 11, 3, 4, 255, 90],
    ],
    ['setResetAllFace', (c: ExMarsCubeControl) => c.setResetAllFace({}), [0, 7, 2, 0, 0, 0, 90]],
    [
      'setFaceRotation: 방향 2는 각도에 8을 더하고 흰색 면은 상위 니블에 싣는다',
      (c: ExMarsCubeControl) => c.setFaceRotation({}, '0', '2', '1'),
      [0, 7, 3, 144, 0, 0, 90],
    ],
    [
      'setFacesRotation: 두 면의 각도를 한 패킷에 합친다',
      (c: ExMarsCubeControl) => c.setFacesRotation({}, '0', '1', '3', '1', '1', '5'),
      [0, 7, 3, 48 | 5, 0, 0, 90],
    ],
    [
      'setCellColorChange: 셀 색 2개를 한 바이트에 담고 인덱스에 면 번호를 싣는다',
      (c: ExMarsCubeControl) =>
        c.setCellColorChange({}, '2', '1', '2', '3', '4', '5', '6', '7', '8'),
      [0, (2 << 5) | 11, 0x12, 0x34, 0x56, 0x78, 90],
    ],
    [
      'setPositionDirectionTorqueChange: 위치를 2~141로 자른다',
      (c: ExMarsCubeControl) => c.setPositionDirectionTorqueChange({}, '1', '200', '1', '9'),
      [0, (1 << 5) | 12, 141, 1, 9, 0, 90],
    ],
    [
      'setSolveCube: 초록 면의 오른쪽 반시계는 보라 면을 11(3+8)도로 돌린다',
      (c: ExMarsCubeControl) => c.setSolveCube({}, '2', '3', '0'),
      [0, 7, 3, 0, 0, 11, 90],
    ],
    [
      'setPlayNote: C#은 흰 면을 11(3+8)로 돌린다',
      (c: ExMarsCubeControl) => c.setPlayNote({}, '1', '0'),
      [0, 7, 3, 176, 0, 0, 90],
    ],
  ])('%s', async (_name, command, expected) => {
    const { fake, control } = await openControl();

    const sent = await sendCommand(fake, () => command(control));

    expect(sent).toEqual([[], expected]);
  });

  it('setNonBrake는 0/1 이외의 값이면 0 7개짜리 패킷을 그대로 보낸다', async () => {
    const { fake, control } = await openControl();

    const sent = await sendCommand(fake, () => control.setNonBrake({}, '2'));

    expect(sent).toEqual([[], [0, 0, 0, 0, 0, 0, 0]]);
  });

  it('setPlayNote의 쉼표(12)는 패킷을 큐에 넣지 않는다', async () => {
    const { fake, control } = await openControl();

    const sent = await sendCommand(fake, () => control.setPlayNote({}, '12', '0'));

    expect(sent).toEqual([]);
  });

  it('닫으면 큐와 타이머를 정리해 남은 명령을 보내지 않는다', async () => {
    const { fake, control } = await openControl();

    const pending = control.setResetAllFace({});
    await control.onBeforeClose({});
    await vi.advanceTimersByTimeAsync(500);
    await pending;

    expect(fake.write).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

/** 열고 receivedTimer의 첫 대기(30ms)가 걸린 직후 바이트를 흘려 보낸 뒤 해석이 끝나게 한다. */
async function openAndReceive(bytes: number[]) {
  const { fake, control } = await openControl();
  // 30ms 틱이 readNext_를 구독하고, 그 구독보다 1ms 늦은 시각의 데이터만 통과한다.
  await vi.advanceTimersByTimeAsync(21);
  fake.raw$.next({ dataBuffer: new Uint8Array(bytes), timestamp: 0 });
  await vi.advanceTimersByTimeAsync(1);
  return { fake, control };
}

/** 지연(기본 20ms)이 있는 조회 메서드를 끝까지 기다린다. */
async function query<T>(call: () => Promise<T>): Promise<T> {
  const pending = call();
  await vi.advanceTimersByTimeAsync(20);
  return pending;
}

describe('ExMarsCubeControl 수신', () => {
  it('한 번에 온 여러 패킷을 헤더 0과 끝 90으로 나눠 센싱·회전·기록·모드로 해석한다', async () => {
    const { control } = await openAndReceive([
      // 센싱 응답, 노란 면(1): 셀 값 [1,2,3,4,6,1,5,2]. 5는 CellColor에 없다.
      ...[0, (1 << 5) | 28, 0x12, 0x34, 0x61, 0x52, 90],
      // 면 회전 방향: 흰 면 3(CW), 노란 면 11(CCW).
      ...[0, 7, 1, 0x3b, 0, 0, 90],
      // 기록 응답: 기록 1번 슬롯 2에 0x0003E8(1000)
      ...[0, (1 << 5) | 9, 2, 0, 3, 232, 90],
      // 모드 응답: 주 3, 부 4
      ...[0, 0, 11, 3, 4, 255, 90],
    ]);

    expect(await query(() => control.getFaceColor({}, '1'))).toEqual([
      'R',
      'G',
      'B',
      'Y',
      'P',
      'R',
      'undefind',
      'G',
      'R',
    ]);
    expect(await query(() => control.getCellColor({}, '1', '0'))).toBe('R');
    expect(await query(() => control.getModeStatus({}))).toBe('34');
    expect(await query(() => control.getModeRecord({}, '1', '2'))).toBe(1);
    expect(await query(() => control.getFaceRotationValue({}, '0'))).toBe('CW');
    // 읽으면 0으로 돌아가므로 다시 읽으면 '0'이다.
    expect(await query(() => control.getFaceRotationValue({}, '0'))).toBe('0');
    expect(await query(() => control.getFaceRotationValue({}, '1'))).toBe('CCW');
  });

  it('전체 면 센싱 응답(면 7)은 6개 면의 셀을 3비트씩 풀어 채운다', async () => {
    // packet[2]=0xFF만 켜면 흰 면 셀 0은 6, 셀 6·7은 7이다.
    const { control } = await openAndReceive([0, (7 << 5) | 28, 0xff, ...Array(17).fill(0), 90]);

    expect(await query(() => control.getCellColor({}, '0', '0'))).toBe('P');
    expect(await query(() => control.getCellColor({}, '0', '6'))).toBe('W');
    expect(await query(() => control.getCellColor({}, '0', '1'))).toBe('O');
  });

  it('범위 밖 면을 조회하면 TypeError로 거부된다', async () => {
    const { control } = await openControl();

    const pending = control.getCellColor({}, '9', '0');
    const assertion = expect(pending).rejects.toThrow(TypeError);
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });
});
