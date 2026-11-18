export type RequestId = string | number;

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface CmdRequest {
  requestId?: RequestId;
  type: 'cmd';
  cmd: string;
  args?: unknown[];
}

export interface ErrorResponsePayload {
  success: false;
  type: 'cmd';
  requestId?: RequestId;
  errorCode: string;
  message?: string;
}

export interface SuccessResponsePayload {
  success: true;
  type: 'cmd';
  requestId?: RequestId;
  value?: any;
}

export interface NotificationPayload {
  success: true;
  type: 'notify';
  kind: string; // ex) connectionState, BUTTON_A_CHANGED, ...
  value?: any;
}

export type ResponsePayload = SuccessResponsePayload | ErrorResponsePayload | NotificationPayload;

export interface IRequestHandlerProto {
  connect: () => Promise<unknown>;
  disconnect: () => Promise<unknown>;
  getConnectionState: () => Promise<ConnectionState>;
  // [cmd: string]: undefined | (() => Promise<unknown>)
}

export interface IParentSender {
  success: <T extends SuccessResponsePayload>(data?: T) => void;
  error: (data: ErrorResponsePayload) => void;
  notify: <T extends NotificationPayload>(data?: T) => void;
}
