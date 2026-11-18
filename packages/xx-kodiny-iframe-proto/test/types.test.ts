// 프로토콜 타입의 좁히기 계약을 고정하는 타입 테스트.
// 런타임 코드가 없어 `expectTypeOf`로 컴파일 시점 계약만 확인한다. 검증은 `pnpm check-types`가 한다.
import { describe, expectTypeOf, it } from 'vitest';
import type {
  CmdRequest,
  CmdResponsePayload,
  ErrorResponsePayload,
  IframeState,
  ISendToParent,
  NotificationPayload,
  RequestId,
  ResponsePayload,
  SuccessResponsePayload,
} from '../src/index.js';

describe('응답 페이로드 타입 좁히기', () => {
  it('ResponsePayload는 성공, 오류, 알림 응답의 합집합이고 CmdResponsePayload는 알림을 뺀 것이다', () => {
    expectTypeOf<ResponsePayload>().toEqualTypeOf<
      SuccessResponsePayload | ErrorResponsePayload | NotificationPayload
    >();
    expectTypeOf<CmdResponsePayload>().toEqualTypeOf<
      SuccessResponsePayload | ErrorResponsePayload
    >();
  });

  it('type이 notify이면 NotificationPayload로, success가 true이면 SuccessResponsePayload로 좁혀진다', () => {
    expectTypeOf<
      Extract<ResponsePayload, { type: 'notify' }>
    >().toEqualTypeOf<NotificationPayload>();
    expectTypeOf<
      Extract<CmdResponsePayload, { success: true }>
    >().toEqualTypeOf<SuccessResponsePayload>();
    expectTypeOf<
      Extract<CmdResponsePayload, { success: false }>
    >().toEqualTypeOf<ErrorResponsePayload>();
  });

  it('ErrorResponsePayload는 errorCode가 필수이고 message와 requestId는 선택이다', () => {
    expectTypeOf<ErrorResponsePayload['errorCode']>().toEqualTypeOf<string>();
    expectTypeOf<ErrorResponsePayload['message']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ErrorResponsePayload['requestId']>().toEqualTypeOf<RequestId | undefined>();
  });

  it('모든 응답은 iframeToken 문자열을 가진다', () => {
    expectTypeOf<ResponsePayload['iframeToken']>().toEqualTypeOf<string>();
  });
});

describe('요청과 상태 타입', () => {
  it('RequestId는 문자열 또는 숫자이고 IframeState는 세 상태 중 하나다', () => {
    expectTypeOf<RequestId>().toEqualTypeOf<string | number>();
    expectTypeOf<IframeState>().toEqualTypeOf<'starting' | 'ready' | 'stopped'>();
  });

  it('CmdRequest는 type이 cmd이고 cmd 이름이 필수이며 args는 선택이다', () => {
    expectTypeOf<CmdRequest['type']>().toEqualTypeOf<'cmd'>();
    expectTypeOf<CmdRequest['cmd']>().toEqualTypeOf<string>();
    expectTypeOf<CmdRequest['args']>().toEqualTypeOf<unknown[] | undefined>();
  });

  it('ISendToParent의 success와 notify는 각 페이로드를 확장한 타입을 받는다', () => {
    expectTypeOf<ISendToParent['error']>().parameter(0).toEqualTypeOf<ErrorResponsePayload>();
    expectTypeOf<ISendToParent['success']>().parameter(0).toExtend<SuccessResponsePayload>();
    expectTypeOf<ISendToParent['notify']>().parameter(0).toExtend<NotificationPayload>();
  });
});
