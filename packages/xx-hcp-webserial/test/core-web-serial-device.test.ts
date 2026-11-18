// WebSerialDevice의 열기·읽기·쓰기·닫기 계약을 가짜 SerialPort로 고정하는 특성화 테스트.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import type { BufferTimestamped, HwDeviceState } from '@cp949/xx-hcp-interface';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSerialDevice } from '../src/hw/WebSerialDevice';
import { createFakeSerialPort } from './core-fakes';

const OPTIONS: SerialOptions = { baudRate: 9600 };

// 스트림 읽기 루프가 진행되도록 매크로태스크를 한 번 넘긴다. Date만 가짜로 쓸 때만 쓴다.
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

let device: WebSerialDevice;

beforeEach(() => {
  // 장치가 console을 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  device = new WebSerialDevice();
});

afterEach(async () => {
  await device.close();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WebSerialDevice open', () => {
  it('open하면 closed, opening, opened 순으로 상태가 바뀌고 포트를 옵션과 함께 연다', async () => {
    const { port, asSerialPort } = createFakeSerialPort();
    const states: HwDeviceState[] = [];
    device.observeDeviceState().subscribe((it) => states.push(it));

    await device.open(asSerialPort, OPTIONS);

    expect(states).toEqual(['closed', 'opening', 'opened']);
    expect(port.open).toHaveBeenCalledWith(OPTIONS);
    expect(device.isOpened()).toBe(true);
    expect(device.getRawSerialPort()).toBe(asSerialPort);
  });

  it('port.open이 실패해 readable이 없으면 200ms 뒤에 다시 연다', async () => {
    vi.useFakeTimers();
    const { port, asSerialPort } = createFakeSerialPort();
    const realOpen = port.open.getMockImplementation()!;
    port.open.mockRejectedValueOnce(new Error('busy'));
    port.open.mockImplementation(realOpen);

    const opening = device.open(asSerialPort, OPTIONS);
    await vi.advanceTimersByTimeAsync(200);
    await opening;

    expect(port.open).toHaveBeenCalledTimes(2);
    expect(device.isOpened()).toBe(true);
  });
});

describe('WebSerialDevice waitUntilOpened', () => {
  it('열리기 전에 timeout이 지나면 TimeoutError로 거부한다', async () => {
    vi.useFakeTimers();

    const waiting = device.waitUntilOpened(100);
    const assertion = expect(waiting).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(100);

    await assertion;
  });

  it('timeout 없이 호출하면 열릴 때까지 기다렸다가 true를 돌려준다', async () => {
    const { asSerialPort } = createFakeSerialPort();

    const waiting = device.waitUntilOpened();
    await device.open(asSerialPort, OPTIONS);

    await expect(waiting).resolves.toBe(true);
  });
});

describe('WebSerialDevice 읽기', () => {
  it('읽은 바이트를 읽은 시각의 timestamp와 함께 방출하고, 닫힌 뒤에는 방출하지 않는다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5000);
    const { asSerialPort, pushRead } = createFakeSerialPort();
    const received: BufferTimestamped[] = [];
    device.observeRawData().subscribe((it) => received.push(it));

    await device.open(asSerialPort, OPTIONS);
    pushRead([1, 2]);
    await flush();

    expect(received).toHaveLength(1);
    expect(received[0].timestamp).toBe(5000);
    expect(Array.from(received[0].dataBuffer)).toEqual([1, 2]);

    await device.close();
    expect(received).toHaveLength(1);
  });
});

describe('WebSerialDevice write', () => {
  it('열린 포트에는 바이트를 그대로 쓴다', async () => {
    const { asSerialPort, written } = createFakeSerialPort();
    await device.open(asSerialPort, OPTIONS);

    await device.write(new Uint8Array([1, 2, 3]));

    expect(written).toEqual([[1, 2, 3]]);
  });

  it('포트가 바인딩되지 않았으면 던지지 않고 경고만 남긴다', async () => {
    await expect(device.write(new Uint8Array([1]))).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith('WebSerialDevice.write() : port is not bound');
  });

  it('writable이 이미 잠겨 있으면 100ms 기다린 뒤 쓰지 않고 돌아온다', async () => {
    vi.useFakeTimers();
    const { port, asSerialPort, written } = createFakeSerialPort();
    await device.open(asSerialPort, OPTIONS);
    const lock = port.writable!.getWriter();

    const writing = device.write(new Uint8Array([1]));
    await vi.advanceTimersByTimeAsync(100);
    await writing;
    lock.releaseLock();

    expect(console.warn).toHaveBeenCalledWith('WebSerialDevice.write() : port is locked');
    expect(written).toEqual([]);
  });
});

describe('WebSerialDevice close', () => {
  it('closing을 거쳐 reader를 취소한 뒤 포트를 닫고 포트 바인딩을 푼다', async () => {
    const events: string[] = [];
    const { port, asSerialPort } = createFakeSerialPort(events);
    await device.open(asSerialPort, OPTIONS);
    device.observeDeviceState().subscribe((it) => events.push(`state:${it}`));

    await device.close();

    expect(events).toEqual([
      'state:opened',
      'state:closing',
      'reader.cancel',
      'port.close',
      'state:closed',
    ]);
    expect(port.close).toHaveBeenCalledTimes(1);
    expect(device.getRawSerialPort()).toBeUndefined();
    expect(device.isOpened()).toBe(false);
  });

  it('port.close가 실패해도 던지지 않고 closed로 끝난다', async () => {
    const { port, asSerialPort } = createFakeSerialPort();
    await device.open(asSerialPort, OPTIONS);
    port.close.mockRejectedValueOnce(new Error('close failed'));

    await expect(device.close()).resolves.toBeUndefined();

    expect(device.isOpened()).toBe(false);
    await expect(device.close()).resolves.toBeUndefined();
  });
});
