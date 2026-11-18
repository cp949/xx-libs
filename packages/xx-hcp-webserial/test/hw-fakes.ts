// 장치별 Control 테스트가 공유하는 가짜 WebSerialDevice.
// Control이 쓰는 표면(observeRawData, observeOpenedOrNot, isOpened, write)만 갖춘다.
// 실제 시리얼 장치에는 접근하지 않는다.
import type { BufferTimestamped } from '@cp949/xx-hcp-interface';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import type { WebSerialDevice } from '../src/hw/WebSerialDevice';

/** 열린 상태를 바꿀 수 있는 가짜 장치. observeRawData는 Subject 기반이다. */
export function createHwFakeDevice(opened = true) {
  const raw$ = new Subject<BufferTimestamped>();
  const opened$ = new BehaviorSubject(opened);
  const write = vi.fn(async (_value: Uint8Array): Promise<void> => {});
  const device = {
    observeRawData: () => raw$.asObservable(),
    observeOpenedOrNot: () => opened$.asObservable(),
    isOpened: () => opened$.value,
    write,
  } as unknown as WebSerialDevice;

  return {
    device,
    raw$,
    opened$,
    write,
    /** write로 넘어간 바이트열을 number[] 목록으로 돌려준다. */
    written: (): number[][] => write.mock.calls.map((call) => Array.from(call[0])),
  };
}
