// 메이커 공용 유틸의 계약을 고정하는 특성화 테스트.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  fromUserX,
  fromUserY,
  genId,
  OBJECT_STAGE_HEIGHT,
  OBJECT_STAGE_SIZE,
  OBJECT_STAGE_WIDTH,
  SecureRandomUnavailableError,
  toUserX,
  toUserY,
  type IMakerAddon,
  type IMakerAddonConfig,
  type IMakerConfig,
} from '../src/index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * `crypto.getRandomValues`가 `next()`가 돌려주는 바이트로 버퍼를 채우게 한다.
 * base36은 바이트 하나가 `byte % 36`번째 글자(0~9, a~z)가 되고, 252 이상은 버려진다.
 * 반환값은 요청한 바이트 길이를 호출 순서대로 모은 배열이다.
 */
const feedBytes = (next: () => number): number[] => {
  const requested: number[] = [];
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint8Array) => {
    requested.push(array.length);
    for (let i = 0; i < array.length; i++) array[i] = next();
    return array;
  }) as never);
  return requested;
};

const constant = (byte: number) => () => byte;

/** 0, 1, 2, … 순서로 바이트를 낸다. */
const counting = () => {
  let n = 0;
  return () => n++;
};

describe('genId', () => {
  it('접두사 뒤에 base36 난수 6자를 붙인다', () => {
    const requested = feedBytes(counting());

    expect(genId('obj_')).toBe('obj_012345');
    // 거부될 몫까지 감안해 ceil(6 * 256 / 252) = 7바이트를 한 번에 요청한다.
    expect(requested).toEqual([7]);
  });

  it('252 이상의 바이트는 버리고 모자라면 남은 글자 수만큼 다시 요청한다', () => {
    const bytes = [252, 253, 254, 255, 35, 36, 37, 38, 39, 40, 41];
    const requested = feedBytes(() => bytes.shift()!);

    // 첫 요청 7바이트: 4개 거부, 35(z) 36(0) 37(1) 수용. 남은 3자는 ceil(3 * 256 / 252) = 4바이트를 다시 요청한다.
    expect(genId('p')).toBe('pz01234');
    expect(requested).toEqual([7, 4]);
  });

  it('난수는 Math.random이 아니라 crypto에서 얻는다', () => {
    const random = vi.spyOn(Math, 'random');
    const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues');

    // 충돌 경로(일련번호, 길이 늘리기)까지 모두 태운다.
    expect(() => genId('p', () => true)).toThrow('genIdAuto() fail');

    expect(random).not.toHaveBeenCalled();
    expect(getRandomValues).toHaveBeenCalledTimes(11);
  });

  it('실제 crypto로 만든 id는 접두사 뒤에 소문자와 숫자 6자다', () => {
    for (let i = 0; i < 200; i++) {
      expect(genId('obj_')).toMatch(/^obj_[0-9a-z]{6}$/);
    }
  });

  it('existing이 true를 돌려주면 접두사에 일련번호를 붙여 다시 만든다', () => {
    feedBytes(constant(10)); // 항상 'a'
    const taken = new Set(['obj_aaaaaa']);

    const id = genId('obj_', (candidate) => taken.has(candidate));

    // 일련번호는 모듈 전체에서 이어지므로 값 자체는 고정하지 않는다.
    expect(id).toMatch(/^obj_\d+aaaaaa$/);
  });

  it('충돌할 때마다 일련번호가 1씩 늘어난다', () => {
    feedBytes(constant(10));
    const collideOnce = () => {
      let first = true;
      return () => {
        const was = first;
        first = false;
        return was;
      };
    };

    const a = genId('p', collideOnce());
    const b = genId('p', collideOnce());

    const seq = (id: string) => Number(/^p(\d+)aaaaaa$/.exec(id)![1]);
    expect(seq(b)).toBe(seq(a) + 1);
  });

  it('계속 충돌하면 난수 길이를 6에서 15까지 늘려 보다가 던진다', () => {
    feedBytes(constant(10));
    const tried: string[] = [];

    expect(() =>
      genId('p', (candidate) => {
        tried.push(candidate);
        return true;
      }),
    ).toThrow('genIdAuto() fail');

    // 첫 시도는 'p' + 6자. 이후는 'p' + 일련번호 + 난수 6자, 이어서 7자, 8자, … 15자.
    const prefix2 = tried[1].slice(0, -6);
    expect(tried[0]).toBe('paaaaaa');
    expect(tried).toHaveLength(11);
    expect(tried.slice(1)).toEqual(
      Array.from({ length: 10 }, (_, k) => prefix2 + 'a'.repeat(6 + k)),
    );
  });

  it('crypto를 쓸 수 없으면 Math.random으로 대체하지 않고 SecureRandomUnavailableError를 던진다', () => {
    const random = vi.spyOn(Math, 'random');
    vi.stubGlobal('crypto', undefined);

    expect(() => genId('p')).toThrow(SecureRandomUnavailableError);
    expect(() => genId('p')).toThrow(
      'globalThis.crypto.getRandomValues is not available in this environment',
    );

    vi.stubGlobal('crypto', {});
    expect(() => genId('p')).toThrow(SecureRandomUnavailableError);
    expect(random).not.toHaveBeenCalled();
  });

  it('globalThis.crypto 접근이 예외를 던져도 미지원으로 본다', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      expect(() => genId('p')).toThrow(SecureRandomUnavailableError);
    } finally {
      Object.defineProperty(globalThis, 'crypto', original);
    }
  });

  it('SecureRandomUnavailableError는 이름을 가진 Error다', () => {
    const error = new SecureRandomUnavailableError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SecureRandomUnavailableError');
  });
});

describe('스테이지 좌표 변환', () => {
  it('스테이지 크기 상수를 노출한다', () => {
    expect(OBJECT_STAGE_WIDTH).toBe(558);
    expect(OBJECT_STAGE_HEIGHT).toBe(335);
    expect(OBJECT_STAGE_SIZE).toEqual({ width: 558, height: 335 });
  });

  it('사용자 좌표는 스테이지 중앙이 원점이고 Y축이 위로 향한다', () => {
    expect(toUserX(279)).toBe(0);
    expect(toUserX(0)).toBe(-279);
    expect(toUserX(558)).toBe(279);
    expect(toUserY(167.5)).toBe(0);
    expect(toUserY(0)).toBe(167.5);
    expect(toUserY(335)).toBe(-167.5);
  });

  it('사용자 좌표에서 스테이지 좌표로 되돌린다', () => {
    expect(fromUserX(0)).toBe(279);
    expect(fromUserX(-279)).toBe(0);
    expect(fromUserY(0)).toBe(167.5);
    expect(fromUserY(167.5)).toBe(0);
  });

  it('값이 없으면 0으로 보고 변환한다', () => {
    expect(toUserX(undefined)).toBe(-279);
    expect(toUserY(undefined)).toBe(167.5);
  });

  it('소수 첫째 자리까지만 남긴다', () => {
    expect(toUserX(279.06)).toBe(0.1);
    expect(toUserX(279.04)).toBe(0);
    expect(fromUserX(0.06)).toBe(279.1);
  });

  it('반올림 결과가 0이 되는 음수는 -0을 돌려준다', () => {
    expect(Object.is(toUserX(278.96), -0)).toBe(true);
    expect(Object.is(toUserY(167.54), -0)).toBe(true);
  });
});

describe('타입', () => {
  it('IMakerConfig는 teachm 세 종류와 tts의 설정을 가진다', () => {
    expectTypeOf<IMakerConfig['teachmPose']>().toEqualTypeOf<{ iframeUrl: string }>();
    expectTypeOf<IMakerConfig['teachmImage']>().toEqualTypeOf<{ iframeUrl: string }>();
    expectTypeOf<IMakerConfig['teachmAudio']>().toEqualTypeOf<{ iframeUrl: string }>();
    expectTypeOf<IMakerConfig['tts']>().toEqualTypeOf<{ url: string; aiToken?: string }>();
  });

  it('IMakerAddon의 훅은 모두 선택이고 IMakerAddonConfig는 애드온 생성자를 가진다', () => {
    expectTypeOf<{}>().toExtend<IMakerAddon>();
    expectTypeOf<IMakerAddonConfig['addonId']>().toEqualTypeOf<string>();
    expectTypeOf<IMakerAddonConfig['propertyName']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<IMakerAddonConfig['addon']>().toEqualTypeOf<
      new (config: IMakerConfig) => IMakerAddon
    >();
  });
});
