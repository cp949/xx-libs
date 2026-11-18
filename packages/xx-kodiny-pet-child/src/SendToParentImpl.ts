import type * as proto from '@cp949/xx-kodiny-pet-proto';
import { logger } from './logger';
import type { send2parent } from './types';

type SendFrameFn = (frame: Omit<proto.Frame, 'iframeToken'>) => void;

/**
 * 프레임에 `iframeToken`을 붙여 부모 window로 `postMessage`한다.
 * 대상 origin은 `*`다. `window.parent`가 없으면 보내지 않는다.
 */
export class SendToParentImpl implements send2parent.ISendToParent {
  readonly cmd: CmdToParent;
  readonly event: EventToParent;
  private DEBUG = false;

  constructor(private readonly iframeToken: string) {
    this.cmd = new CmdToParent(this.send);
    this.event = new EventToParent(this.send);
  }

  /** 켜면 보내는 프레임을 로그로 남긴다. */
  setDebugEnabled(enabled: boolean) {
    this.DEBUG = enabled;
  }

  /** `iframeToken`을 뺀 프레임에 토큰을 붙여 부모에게 보낸다. */
  send = (frame: Omit<proto.Frame, 'iframeToken'>) => {
    if (!window.parent) {
      logger.info(`SendToParentImpl.send(type=${frame.type}) fail: parent is not exists`);
      return;
    }

    if (this.DEBUG) {
      logger.info(`SendToParentImpl.send(type=${frame.type}): ${JSON.stringify(frame)}`);
    }
    window.parent.postMessage({ ...frame, iframeToken: this.iframeToken }, '*');
  };
}

class CmdToParent implements send2parent.ICmd {
  constructor(private readonly sendFrame: SendFrameFn) {
    // empty
  }

  success = <T extends proto.CmdSuccessPayload>(data?: T | null) => {
    const frame: Omit<proto.CmdSuccessFrame, 'iframeToken'> = {
      type: 'cmd',
      success: true,
      ...data,
    };
    this.sendFrame(frame);
  };

  error = <T extends proto.CmdErrorPayload>(data: T) => {
    const frame: Omit<proto.CmdErrorFrame, 'iframeToken'> = {
      type: 'cmd',
      success: false,
      ...data,
    };
    this.sendFrame(frame);
  };
}

class EventToParent implements send2parent.IEvent {
  constructor(private readonly sendFrame: SendFrameFn) {
    // empty
  }

  emit = (eventKey: string, ...args: unknown[]) => {
    const frame: Omit<proto.EventFrame, 'iframeToken'> = {
      type: 'event',
      eventKey,
      args,
    };
    this.sendFrame(frame);
  };
}
