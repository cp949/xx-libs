// HcpPacketHelper의 패킷 생성·파싱 형식과 HcpPacket 접근자를 고정하는 특성화 테스트.
// vitest의 node 환경에서 실행한다. 원본 동작을 그대로 옮긴 코드이므로 어색한 동작도 고치지 않고 고정한다.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HcpPacket, HcpPacketHelper } from '../src/index.js';

const encode = (s: string): Uint8Array => new TextEncoder().encode(s);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('패킷 생성', () => {
  it('createJsonPacket은 channel, contentType, 추가 헤더 순서로 헤더를 쓰고 빈 줄 뒤에 JSON 본문을 붙인다', () => {
    const packet = HcpPacketHelper.createJsonPacket('hw,control', {
      header: { hwId: 'hw1', requestId: 'req1' },
      body: { cmd: 'on', args: [1] },
    });

    expect(packet).toBe(
      'channel: hw,control\ncontentType: json\nhwId: hw1\nrequestId: req1\n\n{"cmd":"on","args":[1]}',
    );
  });

  it('본문이 없거나 null이면 본문은 빈 문자열이다', () => {
    const empty = 'channel: meta,cmd\ncontentType: json\n\n';

    expect(HcpPacketHelper.createJsonPacket('meta,cmd')).toBe(empty);
    expect(HcpPacketHelper.createJsonPacket('meta,cmd', { body: null })).toBe(empty);
  });

  it('추가 헤더가 channel, contentType을 덮어쓴다', () => {
    const packet = HcpPacketHelper.createTextPacket('a,b', {
      header: { contentType: 'custom' },
      body: 'hi',
    });

    expect(packet).toBe('channel: a,b\ncontentType: custom\n\nhi');
  });

  it('createHelloPacket은 meta,hello 텍스트 패킷이다', () => {
    expect(HcpPacketHelper.createHelloPacket()).toBe('channel: meta,hello\ncontentType: text\n\n');
  });
});

describe('parseBuffer', () => {
  it('헤더를 trim해서 읽고 channel을 channelId와 proc으로 나눈다', () => {
    const p = HcpPacketHelper.parseBuffer(
      encode('channel: hw , control\nrequestId:  r1 \n\n{"a":1}'),
    )!;

    expect(p.channelId()).toBe('hw');
    expect(p.proc()).toBe('control');
    expect(p.requestId()).toBe('r1');
    expect(p.bodyAsJson()).toEqual({ a: 1 });
  });

  it('createJsonPacket으로 만든 패킷을 그대로 파싱한다', () => {
    const p = HcpPacketHelper.parseBuffer(
      encode(
        HcpPacketHelper.createJsonPacket('hw,notify', { header: { hwId: 'h' }, body: [1, 2] }),
      ),
    )!;

    expect(p.contentType()).toBe('json');
    expect(p.hwId()).toBe('h');
    expect(p.bodyAsJson()).toEqual([1, 2]);
  });

  it('본문이 비어 있으면 body는 null이고 본문 안의 개행은 보존한다', () => {
    const empty = HcpPacketHelper.parseBuffer(encode('channel: a,b\n\n'))!;
    const multi = HcpPacketHelper.parseBuffer(encode('channel: a,b\n\nline1\nline2\n'))!;

    expect(empty.body).toBeNull();
    expect(empty.bodyLength()).toBe(0);
    expect(multi.bodyAsText()).toBe('line1\nline2\n');
  });

  // 헤더 줄을 split(':', 2)로 나눠 두 번째 ':' 뒤는 버린다. 원본 동작이다.
  it('헤더 값에 ":"가 있으면 첫 ":" 뒤에서 값이 잘린다', () => {
    const p = HcpPacketHelper.parseBuffer(encode('channel: a,b\nurl: http://x:80/p\n\n'))!;

    expect(p.headerOf('url')).toBe('http');
  });

  // channel의 두 번째 ',' 뒤도 split(',', 2)로 버려진다. 원본 동작이다.
  it('channel에 ","가 둘 이상이면 앞의 두 조각만 쓴다', () => {
    const p = HcpPacketHelper.parseBuffer(encode('channel: a,b,c\n\n'))!;

    expect(p.channelId()).toBe('a');
    expect(p.proc()).toBe('b');
  });

  it('":"가 없는 헤더 줄은 무시한다', () => {
    const p = HcpPacketHelper.parseBuffer(encode('channel: a,b\nnoise\n\n'))!;

    expect(p.headers).toEqual({ channel: 'a,b' });
  });

  it.each([
    ['빈 줄(헤더 끝)이 없음', 'channel: a,b\nbody'],
    ['channel 헤더가 없음', 'requestId: r1\n\n'],
    ['channel에 proc이 없음', 'channel: a\n\n'],
    ['channel의 proc이 공백', 'channel: a, \n\n'],
  ])('잘못된 패킷은 던지지 않고 null을 돌려준다: %s', (_name, text) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(HcpPacketHelper.parseBuffer(encode(text))).toBeNull();
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('HcpPacket 접근자', () => {
  it('headerOf는 값을 trim하고, 없거나 빈 값이면 null이다', () => {
    const p = new HcpPacket('a', 'b', null, { x: ' v ', empty: '' });

    expect(p.headerOf('x')).toBe('v');
    expect(p.headerOf('empty')).toBeNull();
    expect(p.headerOf('missing')).toBeNull();
  });

  it('본문이 null이거나 비어 있으면 bodyAsJson과 bodyAsText는 null이다', () => {
    const none = new HcpPacket('a', 'b', null, {});
    const empty = new HcpPacket('a', 'b', new Uint8Array(0), {});

    expect(none.bodyAsJson()).toBeNull();
    expect(empty.bodyAsText()).toBeNull();
    expect(empty.bodyLength()).toBe(0);
  });

  it('본문이 JSON이 아니면 bodyAsJson은 던진다', () => {
    const p = new HcpPacket('a', 'b', encode('not json'), {});

    expect(() => p.bodyAsJson()).toThrow(SyntaxError);
    expect(p.bodyAsText()).toBe('not json');
  });

  it('toString은 헤더와 본문 바이트 수를 쓴다', () => {
    const p = new HcpPacket('a', 'b', encode('abc'), { channel: 'a,b' });

    expect(p.toString()).toBe('HcpPacket:{"headers":{"channel":"a,b"},"body":"3 bytes"}');
  });
});
