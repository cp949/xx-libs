import type * as proto from '@cp949/xx-kodiny-pet-proto';

/** 부모에게 보내는 명령 응답 */
export interface ICmd {
  /** 성공 응답을 보낸다. `data`가 없으면 `requestId`와 `value` 없이 보낸다. */
  success: <T extends proto.CmdSuccessPayload>(data?: T | null) => void;

  /** 실패 응답을 보낸다. */
  error: (data: proto.CmdErrorPayload) => void;
}

/** 부모에게 보내는 이벤트 */
export interface IEvent {
  /** `eventKey` 이벤트를 인자와 함께 보낸다. */
  emit: (eventKey: string, ...args: unknown[]) => void;
}

/** 부모 페이지로 보내는 통로 */
export interface ISendToParent {
  /** 명령 응답을 보낸다. */
  readonly cmd: ICmd;

  /** 이벤트를 보낸다. */
  readonly event: IEvent;
}
