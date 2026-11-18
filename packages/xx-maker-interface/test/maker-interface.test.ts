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
  toUserX,
  toUserY,
  type IMakerAddon,
  type IMakerAddonConfig,
  type IMakerConfig,
} from '../src/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('genId', () => {
  it('접두사 뒤에 base36 난수 6자를 붙인다', () => {
    // 0.123456789.toString(36) = "0.4fzzzxjylrx"
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    expect(genId('obj_')).toBe('obj_4fzzzx');
  });

  it('existing이 true를 돌려주면 접두사에 일련번호를 붙여 다시 만든다', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const taken = new Set(['obj_4fzzzx']);

    const id = genId('obj_', (it) => taken.has(it));

    // 일련번호는 모듈 전체에서 이어지므로 값 자체는 고정하지 않는다.
    expect(id).toMatch(/^obj_\d+4fzzzx$/);
  });

  it('충돌할 때마다 일련번호가 1씩 늘어난다', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
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

    const seq = (id: string) => Number(/^p(\d+)4fzzzx$/.exec(id)![1]);
    expect(seq(b)).toBe(seq(a) + 1);
  });

  it('계속 충돌하면 난수 길이를 6에서 15까지 늘려 보다가 던진다', () => {
    // 이 난수의 base36 소수부는 "4fzzzxjylrx" 11자다.
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const tried: string[] = [];

    expect(() =>
      genId('p', (it) => {
        tried.push(it);
        return true;
      }),
    ).toThrow('genIdAuto() fail');

    // 첫 시도는 'p' + 6자. 이후는 'p' + 일련번호 + 난수 6자, 이어서 7자, 8자, … 15자.
    const digits = '4fzzzxjylrx';
    const prefix2 = tried[1].slice(0, -6);
    expect(tried[0]).toBe('p4fzzzx');
    expect(tried).toHaveLength(11);
    expect(tried.slice(1)).toEqual(
      Array.from({ length: 10 }, (_, k) => prefix2 + digits.slice(0, 6 + k)),
    );
    // 난수 문자열이 11자뿐이라 11자 이후 다섯 번은 같은 id를 시도한다.
    expect(new Set(tried.slice(-5)).size).toBe(1);
  });

  it('난수가 짧으면 요청한 길이보다 짧은 id를 만든다', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // "0.i"

    expect(genId('p')).toBe('pi');

    vi.spyOn(Math, 'random').mockReturnValue(0); // "0"
    expect(genId('p')).toBe('p');
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
