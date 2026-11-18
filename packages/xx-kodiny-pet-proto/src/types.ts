/**
 * kodiny pet iframe 통신 프로토콜의 메시지 타입.
 * 요청(`CmdRequest`)과 응답·이벤트(`Frame`)의 모양만 정의한다.
 */

/** 요청과 응답을 짝짓는 식별자 */
export type RequestId = string | number;

/** iframe의 수명 상태 */
export type IframeState = 'stopped' | 'starting' | 'ready';

/** 명령 성공 응답의 본문 */
export interface CmdSuccessPayload {
  /** 요청의 `requestId`. 짝지을 요청이 없는 응답이면 `undefined` */
  requestId?: RequestId;

  /**
   * 명령이 돌려준 값. 값이 없으면 `undefined`
   *
   * 명령마다 반환 타입이 달라 `any`로 둔다. 좁히는 일은 호출하는 쪽이 한다.
   */
  value?: any;
}

/** 명령 실패 응답의 본문 */
export interface CmdErrorPayload {
  /** 요청의 `requestId`. 짝지을 요청이 없는 응답이면 `undefined` */
  requestId?: RequestId;

  /** 오류 종류를 가리키는 코드 */
  errorCode: string;

  /** 사람이 읽는 오류 설명. 없으면 `undefined` */
  message?: string;
}

/** 이벤트의 본문 */
export interface EventPayload {
  /** 이벤트 종류를 가리키는 키 */
  eventKey: string;

  /** 이벤트에 딸린 인자. 없으면 `undefined` */
  args?: unknown[];
}

/** 명령 실패 응답 프레임 */
export type CmdErrorFrame = {
  iframeToken: string;
  success: false;
  type: 'cmd';
} & CmdErrorPayload;

/** 명령 성공 응답 프레임 */
export type CmdSuccessFrame = {
  iframeToken: string;
  success: true;
  type: 'cmd';
} & CmdSuccessPayload;

/** 이벤트 프레임 */
export type EventFrame = {
  iframeToken: string;
  type: 'event';
} & EventPayload;

/** iframe이 보내는 모든 프레임. `type`과 `success`로 좁힌다. */
export type Frame = CmdSuccessFrame | CmdErrorFrame | EventFrame;

/** 명령 응답 프레임. 성공과 실패를 `success`로 가른다. */
export type CmdFrame = CmdSuccessFrame | CmdErrorFrame;

/** iframe에 보내는 명령 요청 */
export interface CmdRequest {
  /** 응답과 짝짓는 식별자. 응답이 필요 없으면 `undefined` */
  requestId?: RequestId;

  type: 'cmd';

  /** 실행할 명령 이름 */
  cmd: string;

  /** 명령 인자. 없으면 `undefined` */
  args?: unknown[];
}
