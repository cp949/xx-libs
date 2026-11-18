import type { ErrorResponsePayload, SuccessResponsePayload } from '@cp949/xx-kodiny-hw-iframe';

export type CmdResponseData = SuccessResponsePayload | ErrorResponsePayload;

export type IframeConnectionState =
  | 'started'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'stopped';
