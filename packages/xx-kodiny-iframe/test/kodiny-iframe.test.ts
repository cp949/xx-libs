// 부모 페이지 쪽 KodinyIframe 통신 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실행한다. iframe으로 가는 메시지는 `iframe.contentWindow.postMessage` 감시로,
// iframe이 보낸 응답은 부모 window의 message 이벤트로 흉내 낸다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { KodinyIframe } from '../src/index.js';

const TOKEN = 'token-1';

/** iframe이 부모로 보낸 것처럼 message 이벤트를 발생시킨다. */
const fromIframe = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data }));
};

const stateNotify = (value: string, iframeToken = TOKEN) =>
  fromIframe({ iframeToken, success: true, type: 'notify', kind: 'iframe-state', value });

const addIframe = (
  id: string,
): { iframe: HTMLIFrameElement; toIframe: MockInstance<Window['postMessage']> } => {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  document.body.appendChild(iframe);
  const toIframe = vi.spyOn(iframe.contentWindow!, 'postMessage').mockImplementation(() => {});
  return { iframe, toIframe };
};

let iframeApi: KodinyIframe;

beforeEach(() => {
  // 소스가 console을 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  iframeApi?.stop();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('KodinyIframe 상태', () => {
  it('start 직후 starting이고, 같은 토큰의 iframe-state 알림이 오면 그 상태를 따른다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    const states: string[] = [];
    iframeApi.observeState().subscribe((it) => states.push(it));
    const ready: boolean[] = [];
    iframeApi.observeIframeReady().subscribe((it) => ready.push(it));

    iframeApi.start();
    expect(iframeApi.isStarting).toBe(true);
    stateNotify('ready');

    expect(states).toEqual(['stopped', 'starting', 'ready']);
    expect(ready).toEqual([false, true]);
    expect(iframeApi.isReady).toBe(true);
    expect(iframeApi.isStartingOrReady).toBe(true);
    expect(iframeApi.isStopped).toBe(false);
  });

  it('stop은 상태를 stopped로 돌리고 이후 메시지를 받지 않는다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();
    iframeApi.stop();
    const received: unknown[] = [];
    iframeApi.observeNotification().subscribe((it) => received.push(it));

    fromIframe({ iframeToken: TOKEN, success: true, type: 'notify', kind: 'x' });

    expect(iframeApi.isStopped).toBe(true);
    expect(received).toEqual([]);
  });

  it('이미 시작했으면 start를 다시 불러도 ready 상태를 되돌리지 않고 메시지를 한 번만 처리한다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();
    stateNotify('ready');
    iframeApi.start();
    const received: unknown[] = [];
    iframeApi.observeNotification().subscribe((it) => received.push(it));

    fromIframe({ iframeToken: TOKEN, success: true, type: 'notify', kind: 'x' });

    expect(iframeApi.state).toBe('ready');
    expect(received).toHaveLength(1);
  });

  it('iframe이 아직 없으면 500ms마다 다시 찾아 나타난 뒤 마운트로 알린다', () => {
    vi.useFakeTimers();
    iframeApi = new KodinyIframe(TOKEN, '#late');
    const mounted: boolean[] = [];
    iframeApi.observeIframeMounted().subscribe((it) => mounted.push(it));
    iframeApi.start();

    addIframe('late');
    vi.advanceTimersByTime(500);

    expect(mounted).toEqual([false, true]);
  });
});

describe('KodinyIframe 수신 필터', () => {
  it('알림은 observeNotification으로, cmd 응답은 observeCmdResponse로 보낸다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();
    const notifications: unknown[] = [];
    const responses: unknown[] = [];
    iframeApi.observeNotification().subscribe((it) => notifications.push(it));
    iframeApi.observeCmdResponse().subscribe((it) => responses.push(it));

    const notify = { iframeToken: TOKEN, success: true, type: 'notify', kind: 'BUTTON', value: 1 };
    const response = { iframeToken: TOKEN, success: true, type: 'cmd', requestId: 5, value: 'v' };
    fromIframe(notify);
    fromIframe(response);

    expect(notifications).toEqual([notify]);
    expect(responses).toEqual([response]);
  });

  it('iframe-state 값이 세 상태가 아니어도 검사하지 않고 그대로 상태로 쓴다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();

    stateNotify('unknown-state');

    expect(iframeApi.state).toBe('unknown-state');
    expect(iframeApi.isStartingOrReady).toBe(false);
  });

  it('값이 없는 iframe-state 알림은 상태를 바꾸지 않고 일반 알림으로 전달한다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();
    const notifications: unknown[] = [];
    iframeApi.observeNotification().subscribe((it) => notifications.push(it));

    stateNotify('');

    expect(iframeApi.state).toBe('starting');
    expect(notifications).toHaveLength(1);
  });

  it('토큰이 다르거나 success가 boolean이 아니거나 type을 모르는 메시지는 버린다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();
    const received: unknown[] = [];
    iframeApi.observeNotification().subscribe((it) => received.push(it));
    iframeApi.observeCmdResponse().subscribe((it) => received.push(it));

    stateNotify('ready', 'other-token');
    fromIframe({ iframeToken: TOKEN, type: 'notify', kind: 'x' });
    fromIframe({ iframeToken: TOKEN, success: true, type: 'other' });
    // react-devtools 메시지는 source로 걸러진다.
    fromIframe({
      source: 'react-devtools-content-script',
      iframeToken: TOKEN,
      success: true,
      type: 'notify',
    });

    expect(received).toEqual([]);
    expect(iframeApi.state).toBe('starting');
  });

  it('data가 null인 메시지는 핸들러에서 TypeError가 난다', () => {
    addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
      errors.push(event.error);
    };
    window.addEventListener('error', onError);

    fromIframe(null);
    window.removeEventListener('error', onError);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(TypeError);
  });
});

describe('KodinyIframe.runCmd', () => {
  /** runCmd가 iframe에 요청을 보낼 때까지 기다린 뒤, 보낸 요청을 돌려준다. */
  const sentRequest = async (toIframe: MockInstance<Window['postMessage']>) => {
    await vi.waitFor(() => expect(toIframe).toHaveBeenCalled());
    // 요청을 보낸 뒤에 응답 구독이 시작되므로 한 번 비운다.
    await Promise.resolve();
    return toIframe.mock.calls[0];
  };

  it('iframe에 cmd를 보내고 같은 requestId의 성공 응답 value를 돌려준다', async () => {
    const { toIframe } = addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();

    const result = iframeApi.runCmd('connect', ['a', 1]);
    const [message, targetOrigin] = await sentRequest(toIframe);
    const { requestId } = message as { requestId: number };
    const reply = (id: number, value: string) =>
      fromIframe({ iframeToken: TOKEN, success: true, type: 'cmd', requestId: id, value });
    reply(requestId + 1, '다른 요청');
    reply(requestId, '응답');

    expect(message).toEqual({ requestId, type: 'cmd', cmd: 'connect', args: ['a', 1] });
    expect(targetOrigin).toBe('*');
    expect(await result).toBe('응답');
  });

  it('requestId를 지정하면 그 값으로 보낸다', async () => {
    const { toIframe } = addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();

    void iframeApi.runCmd('connect', undefined, 'my-id');
    const [message] = await sentRequest(toIframe);

    expect(message).toEqual({ requestId: 'my-id', type: 'cmd', cmd: 'connect', args: undefined });
  });

  it('errorCode가 있는 실패 응답은 던지지 않고 null을 돌려준다', async () => {
    const { toIframe } = addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();

    const result = iframeApi.runCmd('connect');
    const [message] = await sentRequest(toIframe);
    const { requestId } = message as { requestId: number };
    fromIframe({
      iframeToken: TOKEN,
      success: false,
      type: 'cmd',
      requestId,
      errorCode: 'E1',
      message: 'm',
    });

    expect(await result).toBeNull();
  });

  it('errorCode가 빈 문자열인 실패 응답은 message로 Error를 던진다', async () => {
    const { toIframe } = addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();

    const result = iframeApi.runCmd('connect');
    const [message] = await sentRequest(toIframe);
    const { requestId } = message as { requestId: number };
    fromIframe({
      iframeToken: TOKEN,
      success: false,
      type: 'cmd',
      requestId,
      errorCode: '',
      message: '실패 이유',
    });

    await expect(result).rejects.toThrow('실패 이유');
  });

  it('iframe이 3초 안에 나타나지 않으면 undefined를 돌려준다', async () => {
    vi.useFakeTimers();
    iframeApi = new KodinyIframe(TOKEN, '#없음');
    iframeApi.start();

    const result = iframeApi.runCmd('connect');
    await vi.advanceTimersByTimeAsync(3000);

    expect(await result).toBeUndefined();
  });

  it('응답을 기다리는 중 stop을 부르면 runCmd가 undefined로 끝난다', async () => {
    const { toIframe } = addIframe('frame');
    iframeApi = new KodinyIframe(TOKEN, '#frame');
    iframeApi.start();

    const result = iframeApi.runCmd('connect');
    await sentRequest(toIframe);
    iframeApi.stop();

    expect(await result).toBeUndefined();
  });
});
