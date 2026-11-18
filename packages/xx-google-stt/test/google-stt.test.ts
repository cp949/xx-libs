// GoogleSttSocket과 GoogleSttSession의 동작을 고정하는 특성화 테스트.
// socket.io-client와 RxWebAudio는 가짜로 바꾼다. 서버 이벤트는 가짜 소켓의 `serverEmit`으로 흉내 낸다.
// 원본에서 옮긴 코드이므로 어색해 보이는 동작도 바꾸지 않고 고정한다.
import { config, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleSttRecognition } from '../src/index.js';
import { GoogleSttSession, GoogleSttSocket } from '../src/index.js';

type Handler = (...args: any[]) => void;

/** socket.io-client Socket 중 라이브러리가 쓰는 부분만 흉내 낸다. */
class FakeSocket {
  connected = false;
  handlers = new Map<string, Handler>();
  emitted: { event: string; payload: unknown }[] = [];
  connect = vi.fn();
  on = (event: string, handler: Handler) => {
    this.handlers.set(event, handler);
    return this;
  };
  emit = (event: string, payload?: unknown) => {
    this.emitted.push({ event, payload });
    return true;
  };
  disconnect = vi.fn(() => {
    this.connected = false;
    this.handlers.get('disconnect')?.('io client disconnect');
  });

  /** 서버가 연결을 받아들인 상황 */
  serverConnect = () => {
    this.connected = true;
    this.handlers.get('connect')?.();
  };
  serverDisconnect = () => {
    this.connected = false;
    this.handlers.get('disconnect')?.('transport close');
  };
  serverEmit = (event: string, ...args: unknown[]) => this.handlers.get(event)?.(...args);
}

const mocks = vi.hoisted(() => ({
  sockets: [] as unknown[],
  ioArgs: [] as { url: string; opts: Record<string, unknown> }[],
  audio: undefined as unknown,
}));

vi.mock('socket.io-client', () => ({
  io: (url: string, opts: Record<string, unknown>) => {
    mocks.ioArgs.push({ url, opts });
    const sock = new FakeSocket();
    mocks.sockets.push(sock);
    return sock;
  },
}));

vi.mock('../src/util/RxWebAudio.js', () => ({
  RxWebAudio: { sampling: () => mocks.audio },
}));

const lastSocket = (): FakeSocket => mocks.sockets[mocks.sockets.length - 1] as FakeSocket;

let stop$: Subject<void>;
let audio$: Subject<{ buffer: ArrayBufferLike }>;

beforeEach(() => {
  mocks.sockets.length = 0;
  mocks.ioArgs.length = 0;
  stop$ = new Subject<void>();
  audio$ = new Subject();
  mocks.audio = audio$;
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** RxWebAudio를 가짜로 바꿨으므로 MediaStream 내용은 쓰이지 않는다. */
const media = {} as MediaStream;

describe('GoogleSttSocket', () => {
  it('서버 이벤트에 따라 인식 상태가 바뀌고 finishing은 직전 transcript를 유지한다', async () => {
    const socket = new GoogleSttSocket(stop$, 'https://stt.example.com', '/stt/socket.io');
    const states: GoogleSttRecognition[] = [];
    socket.observeRecognition().subscribe((it) => states.push(it));

    socket.connect();
    const sock = lastSocket();
    sock.serverEmit('stt:recognize-started');
    sock.serverEmit('stt:recognizing', '안녕');
    sock.serverEmit('stt:recognize-finishing');
    sock.serverEmit('stt:recognize-finished', '안녕하세요');

    expect(states).toEqual([
      { state: 'none' },
      { state: 'recognize-started' },
      { state: 'recognizing', transcript: '안녕' },
      { state: 'recognize-finishing', transcript: '안녕' },
      { state: 'recognize-finished', transcript: '안녕하세요' },
    ]);
  });

  it('연결 전에 보낸 요청은 연결된 뒤 전송하고, 연결된 소켓에만 음성을 보낸다', async () => {
    const socket = new GoogleSttSocket(stop$, 'https://stt.example.com', '/stt/socket.io');

    const pending = socket.sendSessionStart({ languageCode: 'ko-KR' });
    const sock = lastSocket();
    expect(sock.emitted).toEqual([]);

    sock.serverConnect();
    expect(await pending).toBe(true);
    expect(sock.emitted).toEqual([{ event: 'stt:start', payload: { languageCode: 'ko-KR' } }]);

    const speech = new Uint8Array([1, 2]);
    expect(await socket.sendSpeech(speech)).toBe(true);
    expect(sock.emitted[1]).toEqual({ event: 'stt:speaking', payload: speech });
  });

  it('인식 도중 연결이 끊기면 마지막 transcript로 recognize-finished를 낸다', () => {
    const socket = new GoogleSttSocket(stop$, 'https://stt.example.com', '/stt/socket.io');
    const states: GoogleSttRecognition[] = [];
    socket.observeRecognition().subscribe((it) => states.push(it));

    socket.connect();
    lastSocket().serverConnect();
    lastSocket().serverEmit('stt:recognizing', '중간');
    lastSocket().serverDisconnect();

    expect(states[states.length - 1]).toEqual({ state: 'recognize-finished', transcript: '중간' });
    expect(socket.getSocketState()).toBe('DISCONNECTED');
  });

  it('인식을 시작하기 전에 끊기면 recognize-finished를 내지 않는다', () => {
    const socket = new GoogleSttSocket(stop$, 'https://stt.example.com', '/stt/socket.io');
    const states: GoogleSttRecognition[] = [];
    socket.observeRecognition().subscribe((it) => states.push(it));

    socket.connect();
    lastSocket().serverConnect();
    lastSocket().serverDisconnect();

    expect(states).toEqual([{ state: 'none' }]);
  });

  it('주소에 localhost가 있으면 지정한 path를 무시하고 /socket.io를 쓴다', () => {
    new GoogleSttSocket(stop$, 'http://localhost:3000', '/stt/socket.io').connect();
    new GoogleSttSocket(stop$, 'https://stt.example.com', '/stt/socket.io').connect();

    expect(mocks.ioArgs.map((it) => it.opts.path)).toEqual(['/socket.io', '/stt/socket.io']);
    expect(mocks.ioArgs[0].opts).toMatchObject({ autoConnect: false, reconnection: false });
  });

  it('연결되기 전에 destroy$가 발행되면 요청은 false로 끝난다', async () => {
    const socket = new GoogleSttSocket(stop$, 'https://stt.example.com', '/stt/socket.io');

    const pending = socket.sendSessionStart({});
    stop$.next();

    expect(await pending).toBe(false);
    expect(lastSocket().emitted).toEqual([]);
  });
});

describe('GoogleSttSession', () => {
  it('open은 옵션과 함께 stt:start를 보내고 running 상태가 된다', async () => {
    const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);
    const states: string[] = [];
    session.observeState().subscribe((it) => states.push(it));

    session.open(media, { languageCode: 'ko-KR' });
    lastSocket().serverConnect();
    await Promise.resolve();

    expect(states).toEqual(['stopped', 'running']);
    expect(lastSocket().emitted).toEqual([
      { event: 'stt:start', payload: { languageCode: 'ko-KR' } },
    ]);
    session.close();
  });

  it('인식이 시작되면 마이크 음성을 stt:speaking으로 보낸다', async () => {
    const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);
    session.open(media, {});
    const sock = lastSocket();
    sock.serverConnect();

    // 인식 시작 전 음성은 보내지 않는다.
    audio$.next({ buffer: new Uint8Array([9]).buffer });
    sock.serverEmit('stt:recognize-started');
    audio$.next({ buffer: new Uint8Array([1, 2]).buffer });
    await Promise.resolve();

    const speaking = sock.emitted.filter((it) => it.event === 'stt:speaking');
    expect(speaking).toHaveLength(1);
    expect(Array.from(speaking[0].payload as Uint8Array)).toEqual([1, 2]);
    session.close();
  });

  it('recognize-finished를 받으면 세션을 닫고 소켓을 끊는다', () => {
    const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);
    const states: string[] = [];
    session.observeState().subscribe((it) => states.push(it));
    session.open(media, {});
    const sock = lastSocket();
    sock.serverConnect();

    sock.serverEmit('stt:recognize-finished', '끝');

    expect(states).toEqual(['stopped', 'running', 'stopped']);
    expect(sock.disconnect).toHaveBeenCalledTimes(1);
  });

  it('연결됐던 소켓이 끊기면 세션도 닫는다', () => {
    const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);
    const states: string[] = [];
    session.observeState().subscribe((it) => states.push(it));
    session.open(media, {});
    const sock = lastSocket();
    sock.serverConnect();

    sock.serverDisconnect();

    expect(states[states.length - 1]).toBe('stopped');
  });

  it('연결된 적 없이 소켓이 끊기면 세션은 running으로 남는다', () => {
    const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);
    const states: string[] = [];
    session.observeState().subscribe((it) => states.push(it));
    session.open(media, {});

    lastSocket().serverDisconnect();

    expect(states[states.length - 1]).toBe('running');
    session.close();
  });

  it('close한 세션을 다시 open하면 음성을 보내지 않는다', async () => {
    const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);
    session.open(media, {});
    session.close();

    session.open(media, {});
    const sock = lastSocket();
    sock.serverConnect();
    sock.serverEmit('stt:recognize-started');
    audio$.next({ buffer: new Uint8Array([1]).buffer });
    await Promise.resolve();

    expect(sock.emitted.filter((it) => it.event === 'stt:speaking')).toEqual([]);
    session.close();
  });

  it('인식이 시작되지 않은 채 sttTimeout이 지나면 처리되지 않은 TimeoutError를 보고한다', async () => {
    // 구독에 error 처리기가 없어 rxjs가 오류를 전역 처리기로 넘긴다. 테스트에서는 그 처리기를 가로챈다.
    const unhandled: unknown[] = [];
    config.onUnhandledError = (err) => unhandled.push(err);
    try {
      const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 20);
      session.open(media, {});

      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(unhandled).toHaveLength(1);
      expect((unhandled[0] as Error).name).toBe('TimeoutError');
      session.close();
    } finally {
      config.onUnhandledError = null;
    }
  });
});
