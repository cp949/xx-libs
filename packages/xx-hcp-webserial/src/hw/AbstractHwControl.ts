import { IHwControl } from '@cp949/xx-hcp-interface';
import { filter, firstValueFrom, map, Observable } from 'rxjs';
import { WebSerialDevice } from './WebSerialDevice';

export abstract class AbstractHwControl implements IHwControl {
  protected packet$: Observable<{ dataBuffer: Uint8Array; timestamp: number }>;

  protected device_: WebSerialDevice;

  constructor(device: WebSerialDevice) {
    this.device_ = device;
    this.packet$ = this.createPacketObservable(device);
  }

  /**
   * Create an Observable that receives data from the device.
   * Create it as a hot Observable.
   * (Use RXJS's share operator)
   * observeRawData() is a hot observable.
   */
  protected createPacketObservable(
    device: WebSerialDevice,
  ): Observable<{ dataBuffer: Uint8Array; timestamp: number }> {
    const pktObservable = this.createCustomPacketObservable(device);
    if (pktObservable) {
      return pktObservable;
    }
    return device.observeRawData();
  }

  /**
   * Create an Observable that receives continuous raw data from a device,
   * creates a packet, and then issues a packet.
   * If it returns NULL, the raw data is used as the packet.
   */
  protected abstract createCustomPacketObservable(
    device: WebSerialDevice,
  ): null | Observable<{ dataBuffer: Uint8Array; timestamp: number }>;

  protected readNext_ = async (ctx: any): Promise<Uint8Array> => {
    const minTimestamp = Date.now();
    return firstValueFrom(
      this.packet$.pipe(
        filter((it) => it.timestamp > minTimestamp),
        map((it) => it.dataBuffer),
      ),
    );
  };

  /**
   * Send values to the device
   */
  protected writeRaw_ = async (values: number[] | Uint8Array): Promise<void> => {
    if (Array.isArray(values)) {
      await this.device_.write(new Uint8Array(values));
    } else {
      await this.device_.write(values);
    }
  };

  /**
   * Observe the packets received from the device.
   */
  observePacket = (): Observable<Uint8Array> => {
    return this.packet$.pipe(map((it) => it.dataBuffer));
  };

  /**
   * Called automatically after the device is opened.
   */
  onAfterOpen = async (ctx: any): Promise<void> => {
    // empty
  };

  /**
   * Called automatically before the device is closed.
   * Usually used to add functionality like stopping a device.
   */
  onBeforeClose = async (ctx: any): Promise<void> => {
    // empty
  };
}
