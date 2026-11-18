// AbstractHwControl의 readNext_ timestamp 필터와 writeRaw_ 입력 형태 계약을 고정하는 특성화 테스트.
import { Observable } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AbstractHwControl } from '../src/hw/AbstractHwControl';
import type { WebSerialDevice } from '../src/hw/WebSerialDevice';
import { createFakeDevice } from './core-fakes';

// createCustomPacketObservable이 null이면 장치의 raw 데이터를 패킷으로 쓴다.
class RawControl extends AbstractHwControl {
  protected createCustomPacketObservable(): null {
    return null;
  }

  read(): Promise<Uint8Array> {
    return this.readNext_({});
  }

  write(values: number[] | Uint8Array): Promise<void> {
    return this.writeRaw_(values);
  }
}

// 사용자 정의 패킷 스트림이 있으면 raw 대신 그것을 쓴다.
class CustomControl extends AbstractHwControl {
  protected createCustomPacketObservable(
    _device: WebSerialDevice,
  ): Observable<{ dataBuffer: Uint8Array; timestamp: number }> {
    return new Observable((subscriber) => {
      subscriber.next({ dataBuffer: new Uint8Array([9]), timestamp: 1 });
    });
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AbstractHwControl readNext_', () => {
  it('호출한 시각보다 timestamp가 큰 패킷만 받고, 같거나 이전 패킷은 버린다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const { device, raw$ } = createFakeDevice();
    const control = new RawControl(device);

    const pending = control.read();
    raw$.next({ timestamp: 999, dataBuffer: new Uint8Array([1]) });
    raw$.next({ timestamp: 1000, dataBuffer: new Uint8Array([2]) });
    raw$.next({ timestamp: 1001, dataBuffer: new Uint8Array([3]) });

    expect(Array.from(await pending)).toEqual([3]);
  });
});

describe('AbstractHwControl writeRaw_', () => {
  it('number[]은 Uint8Array로 바꿔 쓰고 Uint8Array는 그대로 넘긴다', async () => {
    const { device, write } = createFakeDevice();
    const control = new RawControl(device);
    const typed = new Uint8Array([7, 8]);

    await control.write([1, 2, 300]);
    await control.write(typed);

    expect(write.mock.calls[0][0]).toBeInstanceOf(Uint8Array);
    expect(Array.from(write.mock.calls[0][0])).toEqual([1, 2, 44]);
    expect(write.mock.calls[1][0]).toBe(typed);
  });
});

describe('AbstractHwControl 패킷 스트림', () => {
  it('observePacket은 패킷의 dataBuffer만 돌려주고, 사용자 정의 스트림이 있으면 raw를 쓰지 않는다', () => {
    const { device, raw$ } = createFakeDevice();

    const rawPackets: number[][] = [];
    new RawControl(device).observePacket().subscribe((it) => rawPackets.push(Array.from(it)));
    raw$.next({ timestamp: 1, dataBuffer: new Uint8Array([1, 2]) });
    expect(rawPackets).toEqual([[1, 2]]);

    const customPackets: number[][] = [];
    new CustomControl(device).observePacket().subscribe((it) => customPackets.push(Array.from(it)));
    raw$.next({ timestamp: 2, dataBuffer: new Uint8Array([3]) });
    expect(customPackets).toEqual([[9]]);
  });
});
