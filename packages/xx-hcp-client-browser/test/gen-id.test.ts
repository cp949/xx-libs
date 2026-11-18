// requestId 생성기의 계약을 고정하는 특성화 테스트.
// 일련번호는 모듈 상태라 테스트마다 모듈을 새로 불러온다.
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const load = async () => (await import('../src/gen-id.js')).genId;

/** `getRandomValues`가 `words`를 차례로 돌려주게 한다. 호출 횟수를 세는 배열을 돌려준다. */
const feedWords = (words: number[]): number[] => {
  const calls: number[] = [];
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
    calls.push(array.length);
    array[0] = words.shift()!;
    return array;
  }) as never);
  return calls;
};

describe('genId', () => {
  it('접두사 뒤에 36진수 일련번호를 붙이고 호출마다 1씩 늘린다', async () => {
    feedWords([1234]);
    const genId = await load();

    expect(genId('req')).toBe('req' + (1234).toString(36));
    expect(genId('req')).toBe('req' + (1235).toString(36));
    expect(genId('x')).toBe('x' + (1236).toString(36));
  });

  it('시작 값은 [0, 9999]이고 난수는 첫 호출에서 한 번만 뽑는다', async () => {
    const calls = feedWords([9999]);
    const genId = await load();

    expect(genId('p')).toBe('p' + (9999).toString(36));
    expect(genId('p')).toBe('p' + (10000).toString(36));
    expect(calls).toEqual([1]);
  });

  it('시작 값은 word를 10000으로 나눈 나머지다', async () => {
    feedWords([20_001]);
    const genId = await load();

    expect(genId('p')).toBe('p' + (1).toString(36));
  });

  it('편향을 막으려고 4294960000 이상의 word는 버리고 다시 뽑는다', async () => {
    // 2^32 % 10000 = 7296이므로 limit은 4294960000이다.
    const calls = feedWords([4_294_960_000, 4_294_967_295, 4_294_959_999]);
    const genId = await load();

    expect(genId('p')).toBe('p' + (9999).toString(36));
    expect(calls).toEqual([1, 1, 1]);
  });

  it('난수는 Math.random이 아니라 crypto에서 얻는다', async () => {
    const random = vi.spyOn(Math, 'random');
    const genId = await load();

    expect(genId('req')).toMatch(/^req[0-9a-z]+$/);
    expect(random).not.toHaveBeenCalled();
  });

  it('모듈을 불러올 때는 crypto에 접근하지 않고, 첫 호출에서 쓸 수 없으면 던진다', async () => {
    vi.stubGlobal('crypto', undefined);
    const genId = await load();

    expect(() => genId('req')).toThrow(
      'globalThis.crypto.getRandomValues is not available in this environment',
    );
    expect(() => genId('req')).toThrow(
      expect.objectContaining({ name: 'SecureRandomUnavailableError' }),
    );
  });

  it('getRandomValues가 없는 crypto나 접근이 예외를 던지는 crypto도 미지원으로 본다', async () => {
    vi.stubGlobal('crypto', {});
    const noMethod = await load();
    expect(() => noMethod('req')).toThrow('not available');

    vi.unstubAllGlobals();
    vi.resetModules();
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      const blocked = await load();
      expect(() => blocked('req')).toThrow('not available');
    } finally {
      Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
