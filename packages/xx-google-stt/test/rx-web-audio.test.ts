// RxWebAudio.sampling의 변환 동작을 고정하는 특성화 테스트.
// 원본에서 옮긴 코드이므로 어색해 보이는 변환(입력과 출력 샘플레이트가 같을 때 3개 중 1개만 취함 등)도 바꾸지 않고 고정한다.
// jsdom에는 AudioContext가 없어 가짜를 window에 심는다.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RxWebAudio } from '../src/util/RxWebAudio.js';

/** audioprocess 이벤트를 받는 가짜 ScriptProcessorNode */
class FakeProcessor extends EventTarget {
  connect = vi.fn();
  disconnect = vi.fn();
}

const created = {
  processor: new FakeProcessor(),
  source: { connect: vi.fn(), disconnect: vi.fn() },
  close: vi.fn(() => Promise.resolve()),
  bufferSize: 0,
};

class FakeAudioContext {
  destination = {};
  createMediaStreamSource = () => created.source;
  createScriptProcessor = (bufferSize: number) => {
    created.bufferSize = bufferSize;
    return created.processor;
  };
  resume = () => Promise.resolve();
  close = created.close;
}

/** 채널 0의 Float32 샘플을 가진 가짜 AudioBuffer 이벤트를 발생시킨다. */
const emitAudio = (samples: number[], sampleRate: number): void => {
  const inputBuffer = {
    sampleRate,
    duration: samples.length / sampleRate,
    length: samples.length,
    getChannelData: () => Float32Array.from(samples),
  };
  created.processor.dispatchEvent(Object.assign(new Event('audioprocess'), { inputBuffer }));
};

beforeEach(() => {
  created.processor = new FakeProcessor();
  created.source = { connect: vi.fn(), disconnect: vi.fn() };
  created.close = vi.fn(() => Promise.resolve());
  vi.stubGlobal('AudioContext', FakeAudioContext);
  // 정리 로그를 막는다.
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RxWebAudio.sampling', () => {
  it('입력과 출력 샘플레이트가 같으면 3개 중 1개만 골라 Int16으로 바꾼다', () => {
    const out: { length: number; sampleRate: number; buffer: ArrayBufferLike }[] = [];
    const sub = RxWebAudio.sampling({} as MediaStream, 16000, 2048).subscribe((it) => out.push(it));

    // 인덱스 0, 3만 쓴다. 값에 0xffff를 곱한 뒤 Int16 범위로 잘린다(0.5 → 32767, 0.25 → 16383).
    emitAudio([0.5, 9, 9, 0.25, 9, 9], 16000);

    expect(created.bufferSize).toBe(2048);
    expect(out).toHaveLength(1);
    expect(out[0].sampleRate).toBe(16000);
    expect(Array.from(new Int16Array(out[0].buffer))).toEqual([32767, 16383]);
    sub.unsubscribe();
  });

  it('입력이 더 높은 샘플레이트면 구간 평균으로 줄인다', () => {
    const out: { buffer: ArrayBufferLike }[] = [];
    const sub = RxWebAudio.sampling({} as MediaStream, 16000, 2048).subscribe((it) => out.push(it));

    // 48000 → 16000은 3개씩 평균을 낸다. 평균은 1로 제한한 뒤 0x7fff를 곱한다.
    emitAudio([0.3, 0.3, 0.3, 0.6, 0.6, 0.6], 48000);

    expect(Array.from(new Int16Array(out[0].buffer))).toEqual([
      Math.trunc(0.3 * 0x7fff),
      Math.trunc(0.6 * 0x7fff),
    ]);
    sub.unsubscribe();
  });

  it('출력 샘플레이트가 입력보다 높으면 Invalid sampling rate 오류를 낸다', () => {
    const errors: unknown[] = [];
    RxWebAudio.sampling({} as MediaStream, 48000, 2048).subscribe({
      error: (err) => errors.push(err),
    });

    emitAudio([0.1, 0.2, 0.3], 16000);

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('Invalid sampling rate');
  });

  it('구독을 해제하면 source와 processor를 끊고 AudioContext를 닫는다', () => {
    const sub = RxWebAudio.sampling({} as MediaStream, 16000, 2048).subscribe();

    sub.unsubscribe();

    expect(created.source.disconnect).toHaveBeenCalledTimes(1);
    expect(created.processor.disconnect).toHaveBeenCalledTimes(1);
    expect(created.close).toHaveBeenCalledTimes(1);
  });
});
