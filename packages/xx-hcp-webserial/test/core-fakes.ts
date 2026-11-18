// 코어 테스트가 공유하는 가짜 WebSerialDevice와 가짜 SerialPort.
// 실제 시리얼 장치에는 접근하지 않는다.
import type { BufferTimestamped } from '@cp949/xx-hcp-interface';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import type { WebSerialDevice } from '../src/hw/WebSerialDevice';

/** Control이 쓰는 최소 표면(observeRawData, write, isOpened)만 가진 가짜 장치 */
export function createFakeDevice(opened = true) {
  const raw$ = new Subject<BufferTimestamped>();
  const write = vi.fn(async (_value: Uint8Array): Promise<void> => {});
  const isOpened = vi.fn(() => opened);
  const device = {
    observeRawData: () => raw$.asObservable(),
    write,
    isOpened,
  } as unknown as WebSerialDevice;

  return {
    device,
    raw$,
    write,
    isOpened,
    /** write로 넘어간 바이트열을 number[] 목록으로 돌려준다 */
    written: (): number[][] => write.mock.calls.map((call) => Array.from(call[0])),
  };
}

/** 가짜 SerialPort. open()이 성공해야 readable·writable이 생긴다 */
export function createFakeSerialPort(events: string[] = []) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const written: number[][] = [];

  const port = {
    readable: null as ReadableStream<Uint8Array> | null,
    writable: null as WritableStream<Uint8Array> | null,
    open: vi.fn(async (_options: SerialOptions): Promise<void> => {
      port.readable = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
        },
        cancel() {
          events.push('reader.cancel');
        },
      });
      port.writable = new WritableStream<Uint8Array>({
        write(chunk) {
          written.push(Array.from(chunk));
        },
      });
    }),
    close: vi.fn(async (): Promise<void> => {
      events.push('port.close');
      port.readable = null;
      port.writable = null;
    }),
  };

  return {
    port,
    asSerialPort: port as unknown as SerialPort,
    /** 장치가 읽을 데이터를 밀어 넣는다 */
    pushRead: (bytes: number[]) => controller.enqueue(new Uint8Array(bytes)),
    written,
  };
}
