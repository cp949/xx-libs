// DelimiterParser와 InterByteTimeoutParser의 패킷 분할·옵션 검증·타이머 방출 계약을 고정하는 특성화 테스트.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { config, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DelimiterParser } from '../src/hw/DelimiterParser';
import { InterByteTimeoutParser } from '../src/hw/InterByteTimeoutParser';

const bytes = (...values: number[]) => new Uint8Array(values);

const collect = () => {
  const chunks: number[][] = [];
  return { chunks, callback: (chunk: Uint8Array) => chunks.push(Array.from(chunk)) };
};

afterEach(() => {
  vi.useRealTimers();
  config.onUnhandledError = null;
});

describe('DelimiterParser', () => {
  it('청크 경계에 걸친 delimiter를 이어 붙여 패킷을 자르고 delimiter는 뺀다', () => {
    const { chunks, callback } = collect();
    const parser = new DelimiterParser({ delimiter: bytes(0x0d, 0x0a) }, callback);

    parser.enqueue(bytes(1, 2, 0x0d));
    expect(chunks).toEqual([]);
    parser.enqueue(bytes(0x0a, 3));
    parser.enqueue(bytes(4, 0x0d, 0x0a));

    expect(chunks).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('includeDelimiter가 true이면 패킷 끝에 delimiter를 포함한다', () => {
    const { chunks, callback } = collect();
    const parser = new DelimiterParser(
      { delimiter: bytes(0x0d, 0x0a), includeDelimiter: true },
      callback,
    );

    parser.enqueue(bytes(1, 0x0d, 0x0a));

    expect(chunks).toEqual([[1, 0x0d, 0x0a]]);
  });

  it('delimiter 없이 65536바이트가 쌓이면 버퍼를 비우고, 65535바이트까지는 유지한다', () => {
    const kept = collect();
    const keptParser = new DelimiterParser({ delimiter: bytes(0) }, kept.callback);
    keptParser.enqueue(new Uint8Array(65535).fill(1));
    keptParser.enqueue(bytes(0));
    expect(kept.chunks[0]).toHaveLength(65535);

    const dropped = collect();
    const droppedParser = new DelimiterParser({ delimiter: bytes(0) }, dropped.callback);
    droppedParser.enqueue(new Uint8Array(65536).fill(1));
    droppedParser.enqueue(bytes(2, 0));
    expect(dropped.chunks).toEqual([[2]]);
  });

  it('parse는 빈 패킷을 하위로 보내지 않고, 구독을 풀면 상류 구독도 푼다', () => {
    const upstream = new Subject<Uint8Array>();
    const received: number[][] = [];
    const subscription = upstream
      .pipe(DelimiterParser.parse({ delimiter: bytes(0) }))
      .subscribe((chunk) => received.push(Array.from(chunk)));

    upstream.next(bytes(0, 5, 0));
    expect(received).toEqual([[5]]);

    subscription.unsubscribe();
    expect(upstream.observed).toBe(false);
  });
});

describe('InterByteTimeoutParser 옵션 검증', () => {
  it.each([
    [{ interval: 0 }, '"interval" is required'],
    // NaN은 !interval에 먼저 걸려 "not a number"가 아니라 required 오류가 난다.
    [{ interval: Number.NaN }, '"interval" is required'],
    [{ interval: '5' as unknown as number }, '"interval" is not a number'],
    [{ interval: 0.5 }, '"interval" is not greater than 0'],
    [{ interval: 1, maxBufferSize: 'x' as unknown as number }, '"maxBufferSize" is not a number'],
    [{ interval: 1, maxBufferSize: 0 }, '"maxBufferSize" is not greater than 0'],
  ])('잘못된 옵션 %j는 TypeError를 던진다', (opts, message) => {
    let error: unknown;
    try {
      new InterByteTimeoutParser(opts, () => {});
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(TypeError);
    expect((error as TypeError).message).toBe(message);
  });

  it('interval 1은 받아들인다', () => {
    expect(() => new InterByteTimeoutParser({ interval: 1 }, () => {})).not.toThrow();
  });
});

describe('InterByteTimeoutParser 타이머 방출', () => {
  it('마지막 바이트 뒤 interval만큼 조용하면 모인 바이트를 한 패킷으로 방출한다', () => {
    vi.useFakeTimers();
    const { chunks, callback } = collect();
    const parser = new InterByteTimeoutParser({ interval: 5 }, callback);

    parser.enqueue(bytes(1, 2));
    vi.advanceTimersByTime(4);
    parser.enqueue(bytes(3));
    vi.advanceTimersByTime(4);
    expect(chunks).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(chunks).toEqual([[1, 2, 3]]);
  });

  it('maxBufferSize에 닿으면 타이머를 기다리지 않고 방출하고, 남은 바이트는 타이머로 방출한다', () => {
    vi.useFakeTimers();
    const { chunks, callback } = collect();
    const parser = new InterByteTimeoutParser({ interval: 5, maxBufferSize: 3 }, callback);

    parser.enqueue(bytes(1, 2, 3, 4, 5, 6, 7));
    expect(chunks).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);

    vi.advanceTimersByTime(5);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('parse 구독을 풀면 대기 중인 타이머를 취소해 더는 방출하지 않는다', () => {
    vi.useFakeTimers();
    const upstream = new Subject<Uint8Array>();
    const received: number[][] = [];
    const subscription = upstream
      .pipe(InterByteTimeoutParser.parse({ interval: 5 }))
      .subscribe((chunk) => received.push(Array.from(chunk)));

    upstream.next(bytes(1));
    subscription.unsubscribe();
    vi.advanceTimersByTime(10);

    expect(received).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('parse의 상류 complete·error 처리', () => {
  // 원본이 subscriber.complete·subscriber.error를 bind 없이 넘겨서 this가 어긋난다.
  // 하위로 전달되지 않고 TypeError가 rxjs의 unhandled 오류로 보고된다.
  it.each([
    ['DelimiterParser', () => DelimiterParser.parse({ delimiter: bytes(0) })],
    ['InterByteTimeoutParser', () => InterByteTimeoutParser.parse({ interval: 5 })],
  ])('%s: 상류 complete와 error가 하위로 전달되지 않는다', async (_name, createOperator) => {
    const unhandled: unknown[] = [];
    config.onUnhandledError = (err) => unhandled.push(err);

    const events: string[] = [];
    const observe = (upstream: Subject<Uint8Array>) =>
      upstream.pipe(createOperator()).subscribe({
        next: () => events.push('next'),
        error: () => events.push('error'),
        complete: () => events.push('complete'),
      });

    const completing = new Subject<Uint8Array>();
    observe(completing);
    completing.complete();

    const failing = new Subject<Uint8Array>();
    observe(failing);
    failing.error(new Error('boom'));

    // rxjs는 unhandled 오류를 setTimeout으로 보고한다.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(events).toEqual([]);
    expect(unhandled).toHaveLength(2);
    expect(unhandled[0]).toBeInstanceOf(TypeError);
    expect(unhandled[1]).toBeInstanceOf(TypeError);
  });
});
