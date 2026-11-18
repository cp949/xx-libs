// HcpClientSocket의 연결 상태 전이, hello 전송, 수신 필터, stop 동작을 고정하는 특성화 테스트.
// vitest의 node 환경에서 실행한다. WebSocket은 직접 만든 가짜(FakeWebSocket)로 바꾼다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HcpClientSocket, HcpPacketHelper, type HcpConnectionStatus } from '../src/index.js';
import { FakeWebSocket, lastSocket } from './fake-websocket.js';

const text = (channel: string, headers?: Record<string, string>) =>
  HcpPacketHelper.createTextPacket(channel, { header: headers, body: 'b' });

const newSocket = () => {
  const sock = new HcpClientSocket('ws://hcp.test');
  const statuses: HcpConnectionStatus[] = [];
  sock.observeConnectionStatus().subscribe((it) => statuses.push(it));
  return { sock, statuses };
};

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('연결 상태 전이', () => {
  it('start, open, welcome 순서로 DISCONNECTED에서 CONNECTED까지 바뀌고 open 때 hello를 보낸다', () => {
    const { sock, statuses } = newSocket();

    sock.start();
    const ws = lastSocket();
    expect(ws.url).toBe('ws://hcp.test');
    expect(ws.binaryType).toBe('arraybuffer');

    ws.open();
    expect(ws.sentText(0)).toBe('channel: meta,hello\ncontentType: text\n\n');

    ws.receive(text('meta,welcome'));

    expect(statuses).toEqual(['DISCONNECTED', 'CONNECTING', 'PREPARING', 'CONNECTED']);
    expect(sock.isConnected()).toBe(true);
  });

  it('PREPARING이 아닐 때 welcome이 오면 상태를 바꾸지 않고 경고만 낸다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { sock } = newSocket();

    sock.start();
    lastSocket().receive(text('meta,welcome'));

    expect(sock.isConnected()).toBe(false);
    expect(warn).toHaveBeenCalledWith('connection status invalid:CONNECTING');
  });

  it('start를 두 번 부르면 던진다', () => {
    const { sock } = newSocket();
    sock.start();

    expect(() => sock.start()).toThrow('client already started');
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('파싱할 수 없는 메시지는 버린다', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sock } = newSocket();
    const received: unknown[] = [];
    sock.observeHcpMessage().subscribe((it) => received.push(it));

    sock.start();
    lastSocket().receive('garbage');

    expect(received).toEqual([]);
  });
});

describe('수신 필터', () => {
  it('channelId와 proc, channelId, requestId, notify로 각각 걸러낸다', () => {
    const { sock } = newSocket();
    const byChannelMsg: string[] = [];
    const byChannel: string[] = [];
    const byRequestId: string[] = [];
    const notifications: string[] = [];
    sock.observeResponseByChannelMsg('hw', 'control').subscribe((p) => byChannelMsg.push(p.proc()));
    sock.observeResponseByChannel('hw').subscribe((p) => byChannel.push(p.proc()));
    sock.observeResponseByRequestId('r1').subscribe((p) => byRequestId.push(p.channelId()));
    sock.observeNotifications().subscribe((p) => notifications.push(p.channelId()));

    sock.start();
    const ws = lastSocket();
    ws.receive(text('hw,control', { requestId: 'r1' }));
    ws.receive(text('hw,notify'));
    ws.receive(text('meta,notify', { requestId: 'r2' }));

    expect(byChannelMsg).toEqual(['control']);
    expect(byChannel).toEqual(['control', 'notify']);
    expect(byRequestId).toEqual(['hw']);
    expect(notifications).toEqual(['hw', 'meta']);
  });
});

describe('send', () => {
  it('문자열은 UTF-8 Uint8Array로 인코딩하고 그 밖의 값은 그대로 넘긴다', () => {
    const { sock } = newSocket();
    sock.start();
    const ws = lastSocket();
    const bytes = new Uint8Array([1, 2]);

    sock.send('한글');
    sock.send(bytes);

    expect(ws.sent[0]).toBeInstanceOf(Uint8Array);
    expect(ws.sentText(0)).toBe('한글');
    expect(ws.sent[1]).toBe(bytes);
  });

  it('start 전에는 아무것도 보내지 않고 던지지도 않는다', () => {
    const { sock } = newSocket();

    expect(() => sock.send('x')).not.toThrow();
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});

describe('stop', () => {
  it('DISCONNECTED로 돌리고 리스너를 떼고 소켓을 닫으며 수신 스트림을 완료한다', () => {
    const { sock, statuses } = newSocket();
    let completed = false;
    sock.observeHcpMessage().subscribe({ complete: () => (completed = true) });
    const filtered: string[] = [];
    let filteredCompleted = false;
    sock.observeNotifications().subscribe({
      next: (p) => filtered.push(p.channelId()),
      complete: () => (filteredCompleted = true),
    });
    sock.start();
    const ws = lastSocket();
    ws.open();
    ws.receive(text('meta,welcome'));

    sock.stop();

    expect(statuses[statuses.length - 1]).toBe('DISCONNECTED');
    expect(ws.closeCount).toBe(1);
    for (const type of ['open', 'message', 'close', 'error']) {
      expect(ws.listenerCount(type)).toBe(0);
    }
    // observeNotifications는 takeUntil(destroyTrigger$)가 걸려 있어 stop 때 완료된다.
    expect(filteredCompleted).toBe(true);
    // observeHcpMessage는 원본 message$ 그대로라 stop으로 완료되지 않는다.
    expect(completed).toBe(false);

    sock.send('x');
    expect(ws.sent).toHaveLength(1);
  });

  it('서버가 연결을 끊으면(close 이벤트) stop과 같이 정리한다', () => {
    const { sock, statuses } = newSocket();
    sock.start();
    const ws = lastSocket();

    ws.serverClose();

    expect(statuses[statuses.length - 1]).toBe('DISCONNECTED');
    expect(ws.closeCount).toBe(1);
  });

  it('start하지 않고 stop해도 던지지 않는다', () => {
    const { sock } = newSocket();

    expect(() => sock.stop()).not.toThrow();
  });

  it('stop 뒤에 start하면 새 소켓으로 다시 연결한다', () => {
    const { sock, statuses } = newSocket();
    sock.start();
    sock.stop();

    sock.start();
    const second = lastSocket();
    second.open();
    second.receive(text('meta,welcome'));

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(statuses[statuses.length - 1]).toBe('CONNECTED');
  });
});
