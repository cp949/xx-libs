// 테스트용 가짜 WebSocket과 패킷 헬퍼.
// 실제 네트워크를 쓰지 않는다. 서버가 보낸 것처럼 이벤트를 직접 발생시킨다.
import { HcpPacketHelper } from '../src/index.js';

type Listener = (ev: any) => void;

/** 서버 쪽 동작을 테스트가 직접 조종하는 가짜 WebSocket */
export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  binaryType = 'blob';

  /** send()로 받은 값. 문자열은 소켓이 Uint8Array로 인코딩해서 넘긴다. */
  sent: unknown[] = [];

  closeCount = 0;

  private listeners = new Map<string, Set<Listener>>();

  constructor(public url: string | URL) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  send(data: unknown): void {
    this.sent.push(data);
  }

  close(): void {
    this.closeCount++;
  }

  /** 서버 쪽에서 연결이 열린 것처럼 open 이벤트를 발생시킨다. */
  open(): void {
    this.emit('open', {});
  }

  /** 서버가 패킷 문자열을 보낸 것처럼 message 이벤트를 발생시킨다. */
  receive(packetText: string): void {
    const bytes = new TextEncoder().encode(packetText);
    const data = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(data).set(bytes);
    this.emit('message', { data });
  }

  /** 서버 쪽에서 연결을 끊은 것처럼 close 이벤트를 발생시킨다. */
  serverClose(): void {
    this.emit('close', {});
  }

  private emit(type: string, ev: unknown): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(ev);
  }

  /** i번째로 보낸 값을 UTF-8 문자열로 읽는다. */
  sentText(i: number): string {
    return new TextDecoder().decode(this.sent[i] as Uint8Array);
  }

  /** i번째로 보낸 값을 패킷으로 파싱한다. */
  sentPacket(i: number) {
    return HcpPacketHelper.parseBuffer(this.sent[i] as Uint8Array)!;
  }
}

/** 마지막으로 만든 가짜 WebSocket */
export const lastSocket = (): FakeWebSocket => {
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  if (!ws) throw new Error('WebSocket이 만들어지지 않았다');
  return ws;
};
