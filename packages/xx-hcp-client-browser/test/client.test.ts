// HcpClient의 연결, 요청 패킷 내용, 응답 대기 timeout, notification 전달, close를 고정하는 특성화 테스트.
// vitest의 node 환경에서 실행한다. WebSocket은 직접 만든 가짜(FakeWebSocket)로 바꾸고 시간은 가짜 타이머를 쓴다.
// HcpNotificationEvent는 @cp949/xx-hcp-interface의 실제 모듈을 쓴다. 클라이언트와 테스트가 같은 인스턴스를 공유한다.
import { HcpNotificationEvent, type IHcpNotification } from '@cp949/xx-hcp-interface';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HcpClient, HcpPacketHelper, type HcpConnectionStatus } from '../src/index.js';
import { FakeWebSocket, lastSocket } from './fake-websocket.js';

const text = (channel: string, headers?: Record<string, string>, body?: string) =>
  HcpPacketHelper.createTextPacket(channel, { header: headers, body });

/** connect 후 open, welcome까지 진행해 CONNECTED 상태로 만든다. */
const connectClient = (cancel$?: Subject<unknown>) => {
  const client = new HcpClient('ws://hcp.test');
  client.connect(cancel$);
  const ws = lastSocket();
  ws.open();
  ws.receive(text('meta,welcome'));
  return { client, ws };
};

/** 서버가 requestId에 대한 응답을 보낸 것처럼 패킷을 발생시킨다. */
const respond = (ws: FakeWebSocket, requestId: string, body: string) =>
  ws.receive(text('hw,control', { requestId }, body));

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('connect', () => {
  it('welcome을 받으면 CONNECTED가 되고 waitForConnected가 끝난다', async () => {
    const client = new HcpClient('ws://hcp.test');
    const statuses: HcpConnectionStatus[] = [];
    client.observeConnectionStatus().subscribe((it) => statuses.push(it));
    client.connect();
    const ws = lastSocket();
    const waited = client.waitForConnected();

    ws.open();
    ws.receive(text('meta,welcome'));
    await waited;

    expect(statuses).toEqual(['DISCONNECTED', 'CONNECTING', 'PREPARING', 'CONNECTED']);
    expect(client.isConnected()).toBe(true);
  });

  it('이미 CONNECTED면 connect가 던진다', () => {
    const { client } = connectClient();

    expect(() => client.connect()).toThrow('client already started');
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  // CONNECTED 전에 다시 부르면 소켓의 start가 던진다. 그 전에 구독을 새로 만들고 이전 구독은 잃는다.
  // 원본 동작이다. 알림이 이벤트로 두 번 전달된다.
  it('CONNECTED 전에 connect를 다시 부르면 던지고, 알림 구독이 중복되어 알림이 두 번 전달된다', () => {
    const client = new HcpClient('ws://hcp.test');
    client.connect();
    const ws = lastSocket();
    expect(() => client.connect()).toThrow('client already started');
    const received: IHcpNotification[] = [];
    const sub = HcpNotificationEvent.observe().subscribe((it) => received.push(it));

    ws.receive(text('hw,notify', undefined, '{"type":"dup-check"}'));
    sub.unsubscribe();

    expect(received).toEqual([{ type: 'dup-check' }, { type: 'dup-check' }]);
    client.close();
  });

  it('cancel$가 값을 내보내면 close한다', () => {
    const cancel$ = new Subject<unknown>();
    const { client, ws } = connectClient(cancel$);

    cancel$.next(1);

    expect(client.isConnected()).toBe(false);
    expect(ws.closeCount).toBe(1);
  });
});

describe('requestHwControl', () => {
  it('"hwId.cmd" 문자열이면 hw,control 패킷에 hwId, requestId 헤더와 hwId, cmd, args 본문을 담고 같은 requestId의 응답으로 끝난다', async () => {
    const { client, ws } = connectClient();

    const promise = client.requestHwControl('hw1.setLed', 1, 'on');
    const sent = ws.sentPacket(1);
    const requestId = sent.requestId()!;

    expect(sent.channelId()).toBe('hw');
    expect(sent.proc()).toBe('control');
    expect(sent.contentType()).toBe('json');
    expect(sent.hwId()).toBe('hw1');
    expect(requestId).toMatch(/^req/);
    expect(sent.bodyAsJson()).toEqual({ hwId: 'hw1', cmd: 'setLed', args: [1, 'on'] });

    respond(ws, 'other', 'ignored');
    respond(ws, requestId, 'done');
    const response = await promise;

    expect(response.bodyAsText()).toBe('done');
  });

  // hwCommand가 객체일 때 cmdArgs(객체의 args)를 계산해 두고 본문에는 가변 인자 args를 넣는다.
  // 원본 동작이다. 버그로 보이지만 고치지 않고 고정한다.
  it('hwCommand가 객체면 본문 args에 객체의 args가 아니라 가변 인자를 담는다', () => {
    const { client, ws } = connectClient();
    vi.useFakeTimers();

    client
      .requestHwControl({ hwCmd: 'hw1.setLed', args: ['from-object'] }, 'variadic')
      .catch(() => {});
    client.requestHwControl({ hwCmd: 'hw1.setLed', args: ['from-object'] }).catch(() => {});

    expect(ws.sentPacket(1).bodyAsJson()).toEqual({
      hwId: 'hw1',
      cmd: 'setLed',
      args: ['variadic'],
    });
    expect(ws.sentPacket(2).bodyAsJson().args).toEqual([]);
  });

  it('"hwId.cmd" 형식이 아니면 아무것도 보내지 않고 reject한다', async () => {
    const { client, ws } = connectClient();

    await expect(client.requestHwControl('hw1')).rejects.toThrow('unknown');

    expect(ws.sent).toHaveLength(1);
  });
});

describe('requestMetaCmd', () => {
  it('meta,cmd 패킷에 requestId 헤더와 cmd, args 본문을 담고 같은 requestId의 응답으로 끝난다', async () => {
    const { client, ws } = connectClient();

    const promise = client.requestMetaCmd('listHw', 'a', 2);
    const sent = ws.sentPacket(1);
    const requestId = sent.requestId()!;

    expect(sent.channelId()).toBe('meta');
    expect(sent.proc()).toBe('cmd');
    expect(sent.hwId()).toBeNull();
    expect(sent.bodyAsJson()).toEqual({ cmd: 'listHw', args: ['a', 2] });

    ws.receive(text('meta,cmd', { requestId }, 'ok'));

    expect((await promise).bodyAsText()).toBe('ok');
  });
});

describe('응답 대기 timeout', () => {
  it.each([
    ['requestHwControl', (c: HcpClient) => c.requestHwControl('hw1.cmd')],
    ['requestMetaCmd', (c: HcpClient) => c.requestMetaCmd('cmd')],
  ])('%s는 7000ms 안에 응답이 없으면 TimeoutError로 reject한다', async (_name, request) => {
    const { client } = connectClient();
    vi.useFakeTimers();

    const settled = vi.fn();
    const promise = request(client).catch((e: Error) => {
      settled(e.name);
    });

    await vi.advanceTimersByTimeAsync(6999);
    expect(settled).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(settled).toHaveBeenCalledWith('TimeoutError');
  });
});

describe('연결 전 요청', () => {
  it('connect 전에 요청하면 패킷을 보내지 못하고 7000ms 뒤 TimeoutError로 reject한다', async () => {
    const client = new HcpClient('ws://hcp.test');
    vi.useFakeTimers();

    const settled = vi.fn();
    const promise = client.requestMetaCmd('cmd').catch((e: Error) => {
      settled(e.name);
    });
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(settled).toHaveBeenCalledWith('TimeoutError');
  });
});

describe('notification', () => {
  it('proc이 notify인 패킷의 JSON 본문을 HcpNotificationEvent로 전달하고, 다른 패킷은 전달하지 않는다', () => {
    const { ws } = connectClient();
    const received: IHcpNotification[] = [];
    const sub = HcpNotificationEvent.observe().subscribe((it) => received.push(it));

    ws.receive(text('hw,notify', undefined, '{"type":"firmata-value","value":1}'));
    ws.receive(text('hw,control', undefined, '{"type":"ignored"}'));
    sub.unsubscribe();

    expect(received).toEqual([{ type: 'firmata-value', value: 1 }]);
  });

  it('observeHwNotifications(type)은 type이 같은 hw 알림만 돌려준다', () => {
    const { client, ws } = connectClient();
    const all: unknown[] = [];
    const typed: unknown[] = [];
    const s1 = client.observeHwNotifications().subscribe((it) => all.push(it));
    const s2 = client.observeHwNotifications('firmata-value').subscribe((it) => typed.push(it));

    ws.receive(text('hw,notify', undefined, '{"type":"firmata-value","periId":"a"}'));
    // HW_TYPES에 없는 type은 hw 알림으로 보지 않는다.
    ws.receive(text('hw,notify', undefined, '{"type":"other"}'));
    s1.unsubscribe();
    s2.unsubscribe();

    expect(all).toEqual([{ type: 'firmata-value', periId: 'a' }]);
    expect(typed).toEqual(all);
  });
});

describe('close', () => {
  it('소켓을 닫고 DISCONNECTED로 돌리며 이후 알림은 전달하지 않는다', () => {
    const { client, ws } = connectClient();
    const received: IHcpNotification[] = [];
    const sub = HcpNotificationEvent.observe().subscribe((it) => received.push(it));

    client.close();
    ws.receive(text('hw,notify', undefined, '{"type":"after-close"}'));
    sub.unsubscribe();

    expect(client.isConnected()).toBe(false);
    expect(ws.closeCount).toBe(1);
    expect(received).toEqual([]);
  });

  it('connect하지 않고 close해도 던지지 않는다', () => {
    expect(() => new HcpClient('ws://hcp.test').close()).not.toThrow();
  });
});
