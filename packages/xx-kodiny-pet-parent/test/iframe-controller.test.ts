// IframeController와 IframeIo의 부모 쪽 통신 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실제 iframe 요소를 만들고, iframe이 보내는 메시지는 window의 message 이벤트로 흉내 낸다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IframeController } from '../src/index.js';

const TOKEN = 'token-1';
const SELECTOR = '#pet';

/** iframe이 부모에게 보낸 것처럼 message 이벤트를 발생시킨다. */
const fromIframe = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data }));
};

const silentLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn() };

let controller: IframeController;
let iframe: HTMLIFrameElement | undefined;

/** 선택자에 맞는 iframe을 문서에 붙이고 contentWindow.postMessage를 감시한다. */
const mountIframe = () => {
  iframe = document.createElement('iframe');
  iframe.id = 'pet';
  document.body.appendChild(iframe);
  return vi.spyOn(iframe.contentWindow!, 'postMessage');
};

beforeEach(() => {
  controller = new IframeController(TOKEN, SELECTOR);
  controller.setLogger(silentLogger);
});

afterEach(() => {
  controller.stop();
  iframe?.remove();
  iframe = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('상태와 이벤트 수신', () => {
  it('start 직후 starting이고, __iframe-state 이벤트로 ready가 된다', () => {
    mountIframe();
    controller.start();
    expect(controller.state).toBe('starting');

    fromIframe({ iframeToken: TOKEN, type: 'event', eventKey: '__iframe-state', args: ['ready'] });
    expect(controller.state).toBe('ready');
    expect(controller.isReady).toBe(true);
  });

  it('iframeToken이 다른 프레임은 무시한다', () => {
    mountIframe();
    controller.start();
    const handler = vi.fn();
    controller.events.on('hello', handler);

    fromIframe({ iframeToken: 'other', type: 'event', eventKey: 'hello', args: [1] });
    expect(handler).not.toHaveBeenCalled();
  });

  it('일반 이벤트는 args를 펼쳐 events로 전달한다', () => {
    mountIframe();
    controller.start();
    const handler = vi.fn();
    controller.events.on('hello', handler);

    fromIframe({ iframeToken: TOKEN, type: 'event', eventKey: 'hello', args: [1, 'a'] });
    expect(handler).toHaveBeenCalledWith(1, 'a');
  });

  it('stop 뒤에는 메시지를 처리하지 않고 state가 stopped이다', () => {
    mountIframe();
    controller.start();
    const handler = vi.fn();
    controller.events.on('hello', handler);

    controller.stop();
    fromIframe({ iframeToken: TOKEN, type: 'event', eventKey: 'hello' });
    expect(handler).not.toHaveBeenCalled();
    expect(controller.state).toBe('stopped');
  });

  it('iframe이 나중에 붙어도 500ms 간격 확인으로 마운트를 알린다', () => {
    vi.useFakeTimers();
    const mounted: boolean[] = [];
    controller.observeIframeMounted().subscribe((v) => mounted.push(v));
    controller.start();
    expect(mounted).toEqual([false]);

    mountIframe();
    vi.advanceTimersByTime(500);
    expect(mounted).toEqual([false, true]);
  });
});

describe('runCmd', () => {
  it('iframe에 cmd 요청을 보내고 같은 requestId의 성공 응답 value를 돌려준다', async () => {
    const postMessage = mountIframe();
    controller.start();

    const result = controller.runCmd('play', ['idle'], 100);
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(postMessage).toHaveBeenCalledWith(
      { requestId: 100, type: 'cmd', cmd: 'play', args: ['idle'] },
      '*',
    );

    // 다른 requestId의 응답은 기다리는 요청과 짝이 아니다.
    fromIframe({ iframeToken: TOKEN, type: 'cmd', success: true, requestId: 999, value: 'x' });
    fromIframe({ iframeToken: TOKEN, type: 'cmd', success: true, requestId: 100, value: 'ok' });
    await expect(result).resolves.toBe('ok');
  });

  it('errorCode가 있는 실패 응답은 던지지 않고 null을 돌려준다', async () => {
    const postMessage = mountIframe();
    controller.start();

    const result = controller.runCmd('play', [], 101);
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    fromIframe({
      iframeToken: TOKEN,
      type: 'cmd',
      success: false,
      requestId: 101,
      errorCode: 'E1',
    });
    await expect(result).resolves.toBeNull();
  });

  it('errorCode가 빈 문자열인 실패 응답은 message로 Error를 던진다', async () => {
    const postMessage = mountIframe();
    controller.start();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = controller.runCmd('play', [], 102);
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalled());
    fromIframe({
      iframeToken: TOKEN,
      type: 'cmd',
      success: false,
      requestId: 102,
      errorCode: '',
      message: 'bad',
    });
    await expect(result).rejects.toThrow('bad');
  });

  it('iframe이 3초 안에 붙지 않으면 undefined를 돌려준다', async () => {
    vi.useFakeTimers();
    const result = controller.runCmd('play');
    await vi.advanceTimersByTimeAsync(3000);
    await expect(result).resolves.toBeUndefined();
    expect(silentLogger.warn).toHaveBeenCalled();
  });
});
