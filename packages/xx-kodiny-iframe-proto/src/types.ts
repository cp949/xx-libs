export type RequestId = string | number;

export type IframeState = 'starting' | 'ready' | 'stopped';

export interface ErrorResponsePayload {
  iframeToken: string;
  success: false;
  type: 'cmd';
  requestId?: RequestId;
  errorCode: string;
  message?: string;
}

export interface SuccessResponsePayload {
  iframeToken: string;
  success: true;
  type: 'cmd';
  requestId?: RequestId;
  value?: any;
}

export interface NotificationPayload {
  iframeToken: string;
  success: true;
  type: 'notify';
  kind: string; // ex) connectionState, BUTTON_A_CHANGED, ...
  value?: any;
}

export type ResponsePayload = SuccessResponsePayload | ErrorResponsePayload | NotificationPayload;

export type CmdResponsePayload = SuccessResponsePayload | ErrorResponsePayload;

export interface CmdRequest {
  requestId?: RequestId;
  type: 'cmd';
  cmd: string;
  args?: unknown[];
}

export interface ISendToParent {
  success: <T extends SuccessResponsePayload>(data: T) => void;
  error: (data: ErrorResponsePayload) => void;
  notify: <T extends NotificationPayload>(data: T) => void;
}
