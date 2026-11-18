// Teachm*Iframe 세 클래스의 iframe 생성·수명·명령 전달 계약을 고정하는 특성화 테스트.
// vitest의 jsdom 환경에서 실행한다. iframe으로 가는 메시지는 `iframe.contentWindow.postMessage` 감시로,
// iframe이 보낸 응답은 부모 window의 message 이벤트로 흉내 낸다.
// 세 클래스는 거의 같은 코드를 따로 복사한 것이라 표로 같은 검증을 모두에 건다.
// 원본 동작을 그대로 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeachmAudioIframe, TeachmImageIframe, TeachmPoseIframe } from '../src/index.js';

const URL_BASE = 'https://models.example.test/teachm/';

const CASES = [
  {
    label: 'TeachmPoseIframe',
    Class: TeachmPoseIframe,
    name: 'CODINY_IFRAME_TEACHM_POSE',
    audio: false,
  },
  {
    label: 'TeachmImageIframe',
    Class: TeachmImageIframe,
    name: 'CODINY_IFRAME_TEACHM_IMAGE',
    audio: false,
  },
  {
    label: 'TeachmAudioIframe',
    Class: TeachmAudioIframe,
    name: 'CODINY_IFRAME_TEACHM_AUDIO',
    audio: true,
  },
] as const;

/** iframe이 부모로 보낸 것처럼 message 이벤트를 발생시킨다. */
const fromIframe = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data }));
};

const stateNotify = (iframeToken: string, value: string): void =>
  fromIframe({ iframeToken, success: true, type: 'notify', kind: 'iframe-state', value });

const frames = (name: string): HTMLIFrameElement[] =>
  Array.from(document.querySelectorAll<HTMLIFrameElement>(`[id="${name}"]`));

type Instance = { start: () => void; stop: () => void };
let created: Instance[] = [];

beforeEach(() => {
  // 소스가 console을 그대로 쓰므로 출력을 막는다.
  for (const method of ['debug', 'info', 'log', 'warn'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  for (const inst of created) inst.stop();
  created = [];
  document.body.innerHTML = '';
  // refCount는 클래스의 정적 필드라 테스트끼리 이어지지 않게 되돌린다.
  for (const { Class } of CASES) (Class as unknown as { refCount: number }).refCount = 0;
  vi.restoreAllMocks();
});

describe.each(CASES)('$label', ({ Class, name, audio }) => {
  const make = () => {
    const inst = new Class({ iframeUrl: URL_BASE });
    created.push(inst);
    return inst;
  };

  it('start는 화면에 보이지 않는 iframe을 만들고 주소에 iframeToken을 붙인다', () => {
    make().start();

    const [frame, ...rest] = frames(name);
    expect(rest).toEqual([]);
    expect(frame.parentElement).toBe(document.body);
    expect(frame.getAttribute('name')).toBe(name);
    expect(frame.getAttribute('src')).toBe(`${URL_BASE}?iframeToken=${name}`);
    expect(frame.getAttribute('frameborder')).toBe('0');
    expect(frame.getAttribute('width')).toBe('0');
    expect(frame.getAttribute('height')).toBe('0');
    expect(frame.style.width).toBe('0px');
    expect(frame.style.height).toBe('0px');
    // 소리 분류만 마이크 권한을 요청하고, border 스타일은 지정하지 않는다.
    expect(frame.getAttribute('allow')).toBe(audio ? 'microphone' : null);
    expect(frame.style.borderStyle).toBe(audio ? '' : 'none');
  });

  it('같은 id의 iframe이 이미 있으면 새로 만들지 않는다', () => {
    const existing = document.createElement('iframe');
    existing.id = name;
    document.body.appendChild(existing);

    make().start();

    expect(frames(name)).toEqual([existing]);
  });

  it('인스턴스가 여럿이면 마지막 stop에서 iframe을 지운다', () => {
    const a = make();
    const b = make();
    a.start();
    b.start();

    a.stop();
    expect(frames(name)).toHaveLength(1);
    b.stop();
    expect(frames(name)).toHaveLength(0);
  });

  it('같은 인스턴스를 두 번 start하고 한 번 stop하면 iframe이 남는다', () => {
    const a = make();
    a.start();
    a.start();

    a.stop();

    expect(frames(name)).toHaveLength(1);
  });

  it('start하지 않은 인스턴스의 stop도 참조 수를 줄여 다른 인스턴스의 iframe을 지운다', () => {
    const started = make();
    const neverStarted = make();
    started.start();

    neverStarted.stop();

    expect(frames(name)).toHaveLength(0);
  });

  it('start 전에 runCmd를 부르면 경고하고 undefined를 돌려주지만 iframe 요소는 만든다', async () => {
    const inst = make();

    const result = await inst.runCmd('loadModel', ['m']);

    expect(result).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith('iframe not created');
    expect(frames(name)).toHaveLength(1);
  });

  it('runCmd는 iframe이 ready가 된 뒤에 명령을 보내고 같은 requestId의 응답 value를 돌려준다', async () => {
    const inst = make();
    inst.start();
    const toIframe = vi
      .spyOn(frames(name)[0].contentWindow!, 'postMessage')
      .mockImplementation(() => {});

    const result = inst.runCmd('predict', ['m', 'data:image/png;base64,AA']);
    await Promise.resolve();
    expect(toIframe).not.toHaveBeenCalled();

    stateNotify(name, 'ready');
    await vi.waitFor(() => expect(toIframe).toHaveBeenCalled());
    // 요청을 보낸 뒤에 응답 구독이 시작되므로 한 번 비운다.
    await Promise.resolve();
    const [message, targetOrigin] = toIframe.mock.calls[0];
    const { requestId } = message as { requestId: number };
    fromIframe({
      iframeToken: name,
      success: true,
      type: 'cmd',
      requestId: requestId + 1,
      value: '다른 요청',
    });
    fromIframe({ iframeToken: name, success: true, type: 'cmd', requestId, value: '응답' });

    expect(message).toEqual({
      requestId,
      type: 'cmd',
      cmd: 'predict',
      args: ['m', 'data:image/png;base64,AA'],
    });
    expect(targetOrigin).toBe('*');
    expect(await result).toBe('응답');
  });
});
