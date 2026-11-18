// 부모 페이지 쪽 HwIframeManager 통신 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실행한다. iframe으로 가는 메시지는 `iframe.contentWindow.postMessage` 감시로,
// iframe이 보낸 응답은 부모 window의 message 이벤트로 흉내 낸다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { HwIframeManager, hwIframeManager } from '../src/index.js';

/** iframe이 부모로 보낸 것처럼 message 이벤트를 발생시킨다. */
const fromIframe = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data }));
};

const addIframe = (
  id: string,
): { iframe: HTMLIFrameElement; toIframe: MockInstance<Window['postMessage']> } => {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  document.body.appendChild(iframe);
  const toIframe = vi.spyOn(iframe.contentWindow!, 'postMessage').mockImplementation(() => {});
  return { iframe, toIframe };
};

let manager: HwIframeManager;

beforeEach(() => {
  // 매니저가 console을 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  manager?.stop();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HwIframeManager 연결 상태', () => {
  it('start 직후 started이고, iframe이 connectionState 알림을 보내면 그 값을 따른다', () => {
    addIframe('frame');
    manager = new HwIframeManager('#frame');
    const states: string[] = [];
    manager.observeState().subscribe((it) => states.push(it));

    manager.start('hw-1');
    fromIframe({ success: true, type: 'notify', kind: 'connectionState', value: 'connected' });

    expect(states).toEqual(['stopped', 'started', 'connected']);
    expect(manager.isConnected()).toBe(true);
    expect(manager.hwId$.value).toBe('hw-1');
  });

  it('stop은 상태를 stopped로 돌리고 hwId를 지우며 이후 메시지를 받지 않는다', () => {
    addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');

    manager.stop();
    const received: unknown[] = [];
    manager.observeNotification().subscribe((it) => received.push(it));
    fromIframe({ success: true, type: 'notify', kind: 'connectionState', value: 'connected' });

    expect(manager.isStopped).toBe(true);
    expect(manager.hwId$.value).toBeUndefined();
    expect(received).toEqual([]);
  });

  it('기본 선택자는 #KODINY_HW_IFRAME이고 공유 인스턴스도 이를 쓴다', async () => {
    addIframe('KODINY_HW_IFRAME');
    expect(hwIframeManager).toBeInstanceOf(HwIframeManager);

    manager = new HwIframeManager();
    manager.start(undefined);

    expect(await firstValueFrom(manager.observeIframeMounted())).toBe(true);
  });
});

describe('HwIframeManager 수신 필터', () => {
  it('알림은 observeNotification으로, cmd 응답은 observeCmdResponse로 보낸다', () => {
    addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');
    const notifications: unknown[] = [];
    const responses: unknown[] = [];
    manager.observeNotification().subscribe((it) => notifications.push(it));
    manager.observeCmdResponse().subscribe((it) => responses.push(it));

    const notify = { success: true, type: 'notify', kind: 'BUTTON_A_CHANGED', value: 1 };
    const response = { success: true, type: 'cmd', requestId: 5, value: 'v' };
    fromIframe(notify);
    fromIframe(response);

    expect(notifications).toEqual([notify]);
    expect(responses).toEqual([response]);
  });

  it('success가 boolean이 아니거나 type을 모르는 메시지는 버린다', () => {
    addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');
    const received: unknown[] = [];
    manager.observeNotification().subscribe((it) => received.push(it));
    manager.observeCmdResponse().subscribe((it) => received.push(it));

    fromIframe({ type: 'notify', kind: 'x' });
    fromIframe({ success: true, type: 'other' });
    // react-devtools 메시지는 source로 걸러진다.
    fromIframe({
      source: 'react-devtools-content-script',
      success: true,
      type: 'notify',
      kind: 'x',
    });

    expect(received).toEqual([]);
  });
});

describe('HwIframeManager.runCmd', () => {
  /** runCmd가 iframe에 요청을 보낼 때까지 기다린 뒤, 보낸 요청을 돌려준다. */
  const sentRequest = async (toIframe: MockInstance<Window['postMessage']>) => {
    await vi.waitFor(() => expect(toIframe).toHaveBeenCalled());
    // 요청을 보낸 뒤에 응답 구독이 시작되므로 한 번 비운다.
    await Promise.resolve();
    return toIframe.mock.calls[0];
  };

  it('iframe에 cmd를 보내고 같은 requestId의 성공 응답 value를 돌려준다', async () => {
    const { toIframe } = addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');

    const result = manager.runCmd('connect', ['a', 1]);
    const [message, targetOrigin] = await sentRequest(toIframe);
    const { requestId } = message as { requestId: number };
    fromIframe({ success: true, type: 'cmd', requestId: requestId + 1, value: '다른 요청' });
    fromIframe({ success: true, type: 'cmd', requestId, value: '응답' });

    expect(message).toEqual({ requestId, type: 'cmd', cmd: 'connect', args: ['a', 1] });
    expect(targetOrigin).toBe('*');
    expect(await result).toBe('응답');
  });

  it('errorCode가 있는 실패 응답은 던지지 않고 null을 돌려준다', async () => {
    const { toIframe } = addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');

    const result = manager.runCmd('connect');
    const [message] = await sentRequest(toIframe);
    const { requestId } = message as { requestId: number };
    fromIframe({ success: false, type: 'cmd', requestId, errorCode: 'E1', message: 'm' });

    expect(await result).toBeNull();
  });

  it('errorCode가 빈 문자열인 실패 응답은 message로 Error를 던진다', async () => {
    const { toIframe } = addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');

    const result = manager.runCmd('connect');
    const [message] = await sentRequest(toIframe);
    const { requestId } = message as { requestId: number };
    fromIframe({ success: false, type: 'cmd', requestId, errorCode: '', message: '실패 이유' });

    await expect(result).rejects.toThrow('실패 이유');
  });

  it('iframe이 3초 안에 나타나지 않으면 undefined를 돌려준다', async () => {
    vi.useFakeTimers();
    manager = new HwIframeManager('#없음');
    manager.start('hw-1');

    const result = manager.runCmd('connect');
    await vi.advanceTimersByTimeAsync(3000);

    expect(await result).toBeUndefined();
  });

  it('응답을 기다리는 중 stop을 불러도 runCmd는 끝나지 않는다', async () => {
    const { toIframe } = addIframe('frame');
    manager = new HwIframeManager('#frame');
    manager.start('hw-1');

    const result = manager.runCmd('connect');
    await sentRequest(toIframe);
    manager.stop();

    // 응답 대기에 시간 제한이 없고 stop도 대기를 끝내지 않는다.
    const settled = await Promise.race([
      result.then(() => 'settled'),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 50)),
    ]);
    expect(settled).toBe('pending');
  });
});
