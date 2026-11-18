// iframe 안쪽(하드웨어 iframe) 통신 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실행한다. jsdom은 `window.parent === window`이므로 부모로 가는 메시지는
// `window.parent.postMessage` 감시로 확인한다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { AbstractParentSender, IframeCommandAgent } from '../src/index.js';
import type { IRequestHandlerProto } from '../src/index.js';

let toParentSpy: MockInstance<Window['postMessage']>;

beforeEach(() => {
  toParentSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  // IframeCommandAgent가 메시지마다 console.log를 남기므로 출력을 막는다.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 부모가 보낸 message 이벤트를 만든다. */
const messageEvent = (data: unknown) => new MessageEvent('message', { data });

describe('AbstractParentSender', () => {
  it('success, error, notify는 payload를 그대로 부모 window에 targetOrigin * 로 보낸다', () => {
    const sender = new AbstractParentSender();

    sender.success({ success: true, type: 'cmd', requestId: 1, value: 'v' });
    sender.error({ success: false, type: 'cmd', requestId: 2, errorCode: 'E1' });
    sender.notify({ success: true, type: 'notify', kind: 'BUTTON_A_CHANGED', value: 1 });

    expect(toParentSpy.mock.calls).toEqual([
      [{ success: true, type: 'cmd', requestId: 1, value: 'v' }, '*'],
      [{ success: false, type: 'cmd', requestId: 2, errorCode: 'E1' }, '*'],
      [{ success: true, type: 'notify', kind: 'BUTTON_A_CHANGED', value: 1 }, '*'],
    ]);
  });

  it('notifyLoadingState와 notifyConnectionState는 kind와 value가 있는 알림을 보낸다', () => {
    const sender = new AbstractParentSender();

    sender.notifyLoadingState('loaded');
    sender.notifyConnectionState('connecting');

    expect(toParentSpy.mock.calls).toEqual([
      [{ success: true, type: 'notify', kind: 'loadingState', value: 'loaded' }, '*'],
      [{ success: true, type: 'notify', kind: 'connectionState', value: 'connecting' }, '*'],
    ]);
  });
});

describe('IframeCommandAgent', () => {
  const setup = (handler: Record<string, unknown>) => {
    const sender = new AbstractParentSender();
    return IframeCommandAgent.setup(handler as unknown as IRequestHandlerProto, sender);
  };

  it('cmd 이름의 함수를 args로 호출하고 결과를 success 응답으로 보낸다', async () => {
    const connect = vi.fn(async (a: string, b: number) => `${a}:${b}`);
    const agent = setup({ connect });

    await agent.handleMessageEvent(
      messageEvent({ type: 'cmd', requestId: 7, cmd: 'connect', args: ['x', 2] }),
    );

    expect(connect).toHaveBeenCalledWith('x', 2);
    expect(toParentSpy).toHaveBeenCalledWith(
      { success: true, requestId: 7, type: 'cmd', cmd: 'connect', value: 'x:2' },
      '*',
    );
  });

  it('args를 생략하면 빈 인자로 호출한다', async () => {
    const connect = vi.fn(async () => 'ok');
    const agent = setup({ connect });

    await agent.handleMessageEvent(messageEvent({ type: 'cmd', requestId: 1, cmd: 'connect' }));

    expect(connect).toHaveBeenCalledWith();
  });

  it('함수가 던지면 errorCode unknown의 error 응답을 보낸다', async () => {
    const agent = setup({
      connect: async () => {
        throw new Error('연결 실패');
      },
      // Error가 아닌 값을 던져도 문자열로 바꿔 보낸다.
      disconnect: async () => {
        throw 'plain';
      },
    });

    await agent.handleMessageEvent(messageEvent({ type: 'cmd', requestId: 1, cmd: 'connect' }));
    await agent.handleMessageEvent(messageEvent({ type: 'cmd', requestId: 2, cmd: 'disconnect' }));

    expect(toParentSpy.mock.calls).toEqual([
      [
        { requestId: 1, type: 'cmd', success: false, errorCode: 'unknown', message: '연결 실패' },
        '*',
      ],
      [{ requestId: 2, type: 'cmd', success: false, errorCode: 'unknown', message: 'plain' }, '*'],
    ]);
  });

  it('type이 문자열이 아니거나 없는 함수를 가리키는 메시지는 응답 없이 무시한다', async () => {
    const agent = setup({ connect: async () => 'ok' });

    await agent.handleMessageEvent(messageEvent(undefined));
    await agent.handleMessageEvent(messageEvent({ requestId: 1, cmd: 'connect' }));
    await agent.handleMessageEvent(messageEvent({ type: 'cmd', requestId: 2, cmd: 'nothing' }));

    expect(toParentSpy).not.toHaveBeenCalled();
  });

  it('cmd 이름에 허용 목록이 없어 상속받은 함수도 호출된다', async () => {
    const agent = setup({});

    await agent.handleMessageEvent(messageEvent({ type: 'cmd', requestId: 1, cmd: 'toString' }));

    expect(toParentSpy).toHaveBeenCalledWith(
      { success: true, requestId: 1, type: 'cmd', cmd: 'toString', value: '[object Object]' },
      '*',
    );
  });
});
