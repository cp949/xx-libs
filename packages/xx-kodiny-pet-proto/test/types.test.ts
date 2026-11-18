// 프로토콜 타입의 좁히기 계약을 고정하는 타입 테스트.
// 런타임 코드가 없어 `expectTypeOf`로 컴파일 시점 계약만 확인한다. 검증은 `pnpm check-types`가 한다.
import { describe, expectTypeOf, it } from 'vitest';
import type { CmdErrorFrame, CmdFrame, CmdSuccessFrame, EventFrame, Frame } from '../src/index.js';

describe('Frame 타입 좁히기', () => {
  it('type이 event이면 EventFrame으로 좁혀진다', () => {
    expectTypeOf<Extract<Frame, { type: 'event' }>>().toEqualTypeOf<EventFrame>();
  });

  it('type이 cmd이면 CmdFrame으로 좁혀진다', () => {
    expectTypeOf<Extract<Frame, { type: 'cmd' }>>().toEqualTypeOf<CmdFrame>();
  });

  it('success가 true이면 CmdSuccessFrame, false이면 CmdErrorFrame으로 좁혀진다', () => {
    expectTypeOf<Extract<CmdFrame, { success: true }>>().toEqualTypeOf<CmdSuccessFrame>();
    expectTypeOf<Extract<CmdFrame, { success: false }>>().toEqualTypeOf<CmdErrorFrame>();
  });

  it('CmdErrorFrame은 errorCode가 필수이고 message는 선택이다', () => {
    expectTypeOf<CmdErrorFrame['errorCode']>().toEqualTypeOf<string>();
    expectTypeOf<CmdErrorFrame['message']>().toEqualTypeOf<string | undefined>();
  });
});
