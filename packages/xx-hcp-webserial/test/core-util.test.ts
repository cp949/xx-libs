// hw/util.ts 순수 함수의 입출력 계약을 고정하는 특성화 테스트.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  arrayConcat,
  arrayIndexOf,
  atLeast,
  atMost,
  clamp,
  createNumberArray,
  sleepAsync,
  sliceToUint8Array,
} from '../src/hw/util';

afterEach(() => {
  vi.useRealTimers();
});

describe('arrayIndexOf', () => {
  it('needle이 처음 나타나는 위치를 돌려주고, 없거나 src보다 길면 -1이다', () => {
    const src = new Uint8Array([1, 2, 3, 2, 3]);
    expect(arrayIndexOf(src, new Uint8Array([2, 3]))).toBe(1);
    expect(arrayIndexOf(src, new Uint8Array([3, 2, 3]))).toBe(2);
    expect(arrayIndexOf(src, new Uint8Array([9]))).toBe(-1);
    expect(arrayIndexOf(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(-1);
  });
});

describe('arrayConcat', () => {
  it('두 배열을 이어 붙인 새 배열을 만들고 입력은 바꾸지 않는다', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3]);

    const result = arrayConcat(a, b);

    expect(Array.from(result)).toEqual([1, 2, 3]);
    expect(Array.from(a)).toEqual([1, 2]);
    expect(Array.from(b)).toEqual([3]);
  });
});

describe('sliceToUint8Array', () => {
  it('begin 이상 end 미만 구간을 복사하고, 빈 구간이거나 거꾸로면 던진다', () => {
    expect(Array.from(sliceToUint8Array([10, 20, 30, 40], 1, 3))).toEqual([20, 30]);
    expect(() => sliceToUint8Array([10, 20], 1, 1)).toThrow('illegal argument: begin=1, end=1');
    expect(() => sliceToUint8Array([10, 20], 2, 1)).toThrow('illegal argument: begin=2, end=1');
  });
});

describe('createNumberArray', () => {
  it('0으로 채운 배열을 initFn에 넘기고 같은 배열을 돌려준다', () => {
    const result = createNumberArray(3, (arr) => {
      arr[1] = 7;
    });
    expect(result).toEqual([0, 7, 0]);
  });
});

describe('clamp, atMost, atLeast', () => {
  it('경계값은 그대로 두고 범위 밖 값만 경계로 맞춘다', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(atMost(10, 10)).toBe(10);
    expect(atMost(11, 10)).toBe(10);
    expect(atLeast(0, 0)).toBe(0);
    expect(atLeast(-1, 0)).toBe(0);
  });
});

describe('sleepAsync', () => {
  it('0 이하이면 타이머 없이 바로 끝나고, 양수이면 그 시간 뒤에 끝난다', async () => {
    vi.useFakeTimers();

    await sleepAsync(0);
    expect(vi.getTimerCount()).toBe(0);

    let done = false;
    const pending = sleepAsync(100).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
  });
});
