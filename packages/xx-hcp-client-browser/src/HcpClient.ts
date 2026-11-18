import {
  HcpNotificationEvent,
  IHcpHwNotification,
  IHcpNotification,
} from '@cp949/xx-hcp-interface';
import { Observable, Subscription, filter, firstValueFrom, take, timeout } from 'rxjs';
import { HcpClientSocket } from './HcpClientSocket.js';
import { HcpPacketHelper } from './HcpPacketHelper.js';
import { genId } from './gen-id.js';
import { HcpConnectionStatus, HcpPacket } from './types.js';

const nextRequestId = () => genId('req');

const REQUEST_TIMEOUT = 7000;

export class HcpClient {
  private sock_: HcpClientSocket;

  DEBUG = false;

  private subscription_?: Subscription = undefined;

  // private notification$ = new Subject<HcpPacket>()

  constructor(address: string | URL) {
    this.sock_ = new HcpClientSocket(address);
  }

  observeConnectionStatus = (): Observable<HcpConnectionStatus> => {
    return this.sock_.observeConnectionStatus();
  };

  isConnected = (): boolean => {
    return this.sock_.isConnected();
  };

  waitForConnected = async (): Promise<void> => {
    await firstValueFrom(
      this.observeConnectionStatus() //
        .pipe(
          filter((it) => it === 'CONNECTED'),
          take(1),
        ),
    );
  };

  connect = (cancel$?: Observable<any>) => {
    if (this.sock_.isConnected()) {
      throw new Error('client already started');
    }
    const s = this.sock_;
    this.subscription_ = new Subscription();
    this.subscription_.add(s.observeConnectionStatus().subscribe(this.debugConnectionStatus_));
    this.subscription_.add(s.observeHcpMessage().subscribe(this.debugHcpPacket_));
    this.subscription_.add(s.observeNotifications().subscribe(this.onNotification_));
    if (cancel$) {
      this.subscription_.add(cancel$.pipe(take(1)).subscribe(this.close));
    }
    s.start();
  };

  private debugConnectionStatus_ = (status: HcpConnectionStatus) => {
    if (this.DEBUG) console.log('HcpClient.debugConnectionStatus_() ' + status);
  };

  private debugHcpPacket_ = (msg: HcpPacket) => {
    if (this.DEBUG)
      console.log('HcpClient.debugHcpPacket_() ' + msg.channelId() + ',' + msg.proc());
  };

  private onNotification_ = (payload: HcpPacket) => {
    const body = payload.bodyAsJson();
    if (this.DEBUG) console.log('HcpClient.onNotification_() ', body);
    HcpNotificationEvent.send(body as IHcpNotification);
  };

  requestHwControl = async (
    hwCommand: string | { hwCmd: string; args?: any[] },
    ...args: unknown[]
  ): Promise<HcpPacket> => {
    const requestId = nextRequestId();
    let hwId: string | undefined;
    let cmd: string | undefined;
    let cmdArgs: unknown[] = args;
    if (typeof hwCommand === 'string') {
      const arr = hwCommand.split('.');
      hwId = arr[0];
      cmd = arr[1];
    } else if (typeof hwCommand === 'object') {
      const arr = hwCommand.hwCmd.split('.');
      hwId = arr[0];
      cmd = arr[1];
      cmdArgs = hwCommand.args ?? [];
    }

    if (!hwId || !cmd) {
      throw new Error('unknown');
    }
    // create packet
    const packet = HcpPacketHelper.createJsonPacket('hw,control', {
      header: {
        hwId,
        requestId,
      },
      body: {
        hwId,
        cmd,
        args,
      },
    });

    // send packet
    this.sock_.send(packet);

    // wait for response
    return firstValueFrom(
      this.sock_
        .observeResponseByRequestId(requestId) //
        .pipe(timeout({ first: REQUEST_TIMEOUT })),
    );
  };

  requestMetaCmd = async (cmd: string, ...args: unknown[]): Promise<HcpPacket> => {
    const requestId = nextRequestId();

    const packet = HcpPacketHelper.createJsonPacket('meta,cmd', {
      header: {
        requestId,
      },
      body: {
        cmd,
        args,
      },
    });

    // send packet
    this.sock_.send(packet);

    // wait for response
    return firstValueFrom(
      this.sock_
        .observeResponseByRequestId(requestId) //
        .pipe(timeout({ first: REQUEST_TIMEOUT })),
    );
  };

  observeHwNotifications = (type?: string): Observable<IHcpHwNotification> => {
    if (type) {
      return HcpNotificationEvent.observeHwNotification().pipe(
        filter((it) => (it as any)['type'] === type),
      );
    }
    return HcpNotificationEvent.observeHwNotification();
  };

  close = () => {
    if (this.DEBUG) console.log('HcpClient.close()');
    this.sock_.stop();
    this.subscription_?.unsubscribe();
    this.subscription_ = undefined;
  };
}
