// 다이얼로그 requestId 생성기의 계약을 고정하는 특성화 테스트.
// 일련번호는 모듈 상태라 테스트마다 모듈을 새로 불러온다.
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const load = async () => (await import('../src/genId.js')).genId;

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
  it('접두사, 네 자리 난수 둘, 밑줄, 일련번호 순서로 만든다. 일련번호는 2부터 1씩 늘어난다', async () => {
    // word % 9000 + 1000: 0 → 1000, 8999 → 9999, 1 → 1001, 2 → 1002
    feedWords([0, 8999, 1, 2]);
    const genId = await load();

    expect(genId('P_')).toBe('P_10009999_2');
    expect(genId('P_')).toBe('P_10011002_3');
  });

  it('난수는 1000 이상 9999 이하의 네 자리다', async () => {
    const genId = await load();

    for (let i = 0; i < 200; i++) {
      expect(genId('P_')).toMatch(/^P_[1-9]\d{3}[1-9]\d{3}_\d+$/);
    }
  });

  it('편향을 막으려고 4294962000 이상의 word는 버리고 다시 뽑는다', async () => {
    // 2^32 % 9000 = 5296이므로 limit은 4294962000이다.
    const calls = feedWords([4_294_962_000, 4_294_967_295, 4_294_961_999, 0]);
    const genId = await load();

    // 4294961999 % 9000 = 8999 → 9999. 둘째 난수는 0 → 1000이다.
    expect(genId('P_')).toBe('P_99991000_2');
    expect(calls).toEqual([1, 1, 1, 1]);
  });

  it('난수는 Math.random이 아니라 crypto에서 얻는다', async () => {
    const random = vi.spyOn(Math, 'random');
    const genId = await load();

    genId('P_');

    expect(random).not.toHaveBeenCalled();
  });

  it('crypto를 쓸 수 없으면 Math.random으로 대체하지 않고 던진다', async () => {
    const random = vi.spyOn(Math, 'random');
    vi.stubGlobal('crypto', undefined);
    const genId = await load();

    expect(() => genId('P_')).toThrow(
      'globalThis.crypto.getRandomValues is not available in this environment',
    );
    expect(() => genId('P_')).toThrow(
      expect.objectContaining({ name: 'SecureRandomUnavailableError' }),
    );
    expect(random).not.toHaveBeenCalled();
  });

  it('getRandomValues가 없는 crypto나 접근이 예외를 던지는 crypto도 미지원으로 본다', async () => {
    vi.stubGlobal('crypto', {});
    const noMethod = await load();
    expect(() => noMethod('P_')).toThrow('not available');

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
      expect(() => blocked('P_')).toThrow('not available');
    } finally {
      Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
