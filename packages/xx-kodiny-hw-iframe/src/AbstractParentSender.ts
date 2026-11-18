import type {
  ConnectionState,
  ErrorResponsePayload,
  IParentSender,
  NotificationPayload,
  SuccessResponsePayload,
} from './types.js';

export class AbstractParentSender implements IParentSender {
  success = <T extends SuccessResponsePayload>(payload?: T) => {
    if (!window.parent) {
      console.info('AbstractParentSender.success() fail: parent is not exists');
      return;
    }

    window.parent.postMessage(payload, '*');
  };

  error = <T extends ErrorResponsePayload>(payload?: T) => {
    if (!window.parent) {
      console.info('AbstractParentSender.error() fail: parent is not exists');
      return;
    }

    window.parent.postMessage(payload, '*');
  };

  notify = <T extends NotificationPayload>(payload?: T) => {
    if (!window.parent) {
      console.info('AbstractParentSender.notify() fail: parent is not exists');
      return;
    }
    window.parent.postMessage(payload, '*');
  };

  notifyLoadingState = (state: 'loaded' | 'unloaded') => {
    this.notify({
      success: true,
      type: 'notify',
      kind: 'loadingState',
      value: state,
    });
  };

  notifyConnectionState = (state: ConnectionState) => {
    this.notify({
      success: true,
      type: 'notify',
      kind: 'connectionState',
      value: state,
    });
  };
}
