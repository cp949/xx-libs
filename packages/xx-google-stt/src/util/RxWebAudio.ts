import { fromEvent, map, Observable, switchMap } from 'rxjs';
import log from '../log.js';

// catch로 받은 값이 Error가 아닐 수 있어 문자열로 바꿔 쓴다.
const errmsg = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const createAudioContext = (options?: AudioContextOptions): AudioContext => {
  const Ctx = window.AudioContext || (window as any)['webkitAudioContext'];
  return new Ctx(options);
};

function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
  let len = buffer.length;
  const buf = new Int16Array(len / 3);

  while (len--) {
    if (len % 3 === 0) {
      buf[len / 3] = buffer[len] * 0xffff;
    }
  }
  return buf;
}

const samplingAudio = (audioBuffer: AudioBuffer, outSampleRate: number): Int16Array => {
  const inSampleRate = audioBuffer.sampleRate;
  const buffer = audioBuffer.getChannelData(0);
  if (inSampleRate === outSampleRate) {
    return convertFloat32ToInt16(buffer);
  }

  if (outSampleRate > inSampleRate) {
    throw new Error('Invalid sampling rate');
  }

  const ratio = inSampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
};

const createAudioProcessor = (
  media: MediaStream,
  bufferSize: number,
): Observable<ScriptProcessorNode> => {
  return new Observable((observer) => {
    const audioCtx = createAudioContext({ latencyHint: 'interactive' });
    const inChannelCnt = 1;
    const outChannelCnt = 1;
    const source = audioCtx.createMediaStreamSource(media);
    const processor = audioCtx.createScriptProcessor(bufferSize, inChannelCnt, outChannelCnt);
    source.connect(processor);
    processor.connect(audioCtx.destination);
    audioCtx.resume().catch(() => {
      // ignore
    });
    observer.next(processor);
    return () => {
      log.debug('close audio context');
      try {
        source.disconnect();
      } catch (ignore) {
        log.debug('XXX source.disconnect', errmsg(ignore));
      }

      try {
        processor.disconnect();
        // processor.disconnect(audioCtx.destination);
      } catch (ignore) {
        log.debug('XXX processor.disconnect()', errmsg(ignore));
      }

      audioCtx.close().catch((ignore) => {
        log.debug('XXX audioCtx.close() fail', errmsg(ignore));
      });
    };
  });
};

interface AudioSampledBuffer {
  duration: number;
  length: number;
  sampleRate: number;
  buffer: ArrayBufferLike;
}

export const RxWebAudio = {
  sampling: (
    media: MediaStream,
    sampleRate: number,
    bufferSize: number,
  ): Observable<AudioSampledBuffer> => {
    return createAudioProcessor(media, bufferSize).pipe(
      switchMap((audioProcessor) =>
        // fromEvent<AudioProcessingEvent>(audioProcessor, "audioprocess")
        fromEvent<{ inputBuffer: AudioBuffer }>(audioProcessor, 'audioprocess'),
      ),
      // tap(() => {
      //     log.debug('audiobuffer')
      // }),
      map((event) => ({
        duration: event.inputBuffer.duration,
        length: event.inputBuffer.length,
        sampleRate,
        buffer: samplingAudio(event.inputBuffer, sampleRate).buffer,
      })),
    );
  },
};
