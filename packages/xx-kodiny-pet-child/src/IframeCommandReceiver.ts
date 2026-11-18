import type * as proto from '@cp949/xx-kodiny-pet-proto';
import type { EventEmitter } from './eventemitter';
import type { PetCommandEventMap } from './events';
import { logger } from './logger';

/**
 * 메시지가 명령 요청 후보인지 검사한다.
 * `type`과 `cmd`가 문자열이고 `source`에 `devtools`가 없으면 통과한다.
 * `any`는 `event.data`가 임의 값이라 쓴다.
 */
function isValidFrame(data: any) {
  if (!data) return false;
  const source = data['source'];
  if (typeof source === 'string' && source.includes('devtools')) {
    // ignore devtools
    return false;
  }
  const type = data.type;

  if (typeof type !== 'string') {
    // log.debug('[C] unknown message', data)
    return false;
  }

  const cmd = data.cmd;
  if (typeof cmd !== 'string') {
    // log.debug('[C] unknown message', data)
    return false;
  }

  return true;
}

/**
 * 부모가 보낸 `message` 이벤트를 `commandEvents`의 `command` 이벤트로 바꿔 준다.
 * `event.origin`, `event.source`, `iframeToken`은 검사하지 않는다.
 */
export class IframeCommandReceiver {
  private DEBUG = false;
  private readonly commandEvents: EventEmitter<PetCommandEventMap>;

  constructor(eventEmitter: EventEmitter<PetCommandEventMap>) {
    this.commandEvents = eventEmitter;
  }

  /** 켜면 받은 메시지를 로그로 남긴다. */
  setDebugEnabled(enabled: boolean) {
    this.DEBUG = enabled;
  }

  /** window의 `message` 수신을 시작한다. */
  startListen = () => {
    window.addEventListener('message', this.handleMessageEvent);
  };

  /** window의 `message` 수신을 멈춘다. */
  stopListen = () => {
    window.removeEventListener('message', this.handleMessageEvent);
  };

  /** 명령 수신 콜백을 등록한다. 돌려준 함수를 부르면 등록을 푼다. */
  registerOnCmdReceive = (cb: (cmdReuqest: proto.CmdRequest) => any) => {
    this.commandEvents.on('command', cb);
    return () => {
      this.commandEvents.off('command', cb);
    };
  };

  /** 명령 수신 콜백을 한 번만 받도록 등록한다. 돌려준 함수를 부르면 등록을 푼다. */
  registerOnceCmdReceive = (cb: (cmReuqest: proto.CmdRequest) => any) => {
    this.commandEvents.once('command', cb);
    return () => {
      this.commandEvents.off('command', cb);
    };
  };

  /** 등록한 명령 수신 콜백을 푼다. */
  unregisterOnCmdReceive = (cb: (cmdReuqest: proto.CmdRequest) => any) => {
    this.commandEvents.off('command', cb);
  };

  private handleMessageEvent = (event: MessageEvent<unknown>) => {
    if (this.DEBUG) {
      logger.debug('IframeCommandReceiver.handleMessageEvent(): message received', event);
    }

    if (!isValidFrame(event.data)) {
      return;
    }

    this.commandEvents.emit('command', event.data as proto.CmdRequest);
  };
}
