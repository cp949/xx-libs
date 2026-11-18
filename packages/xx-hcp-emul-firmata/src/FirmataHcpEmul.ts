import { IHwEmul } from '@cp949/xx-hcp-interface';
import {
  Observable,
  filter,
  firstValueFrom,
  from,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { FirmataManager } from './FirmataManager.js';
import { FirmataValueNotification } from './FirmataValueNotification.js';
import { PeripheralRegistry } from './PeripheralRegistry.js';
import log from './log.js';
import { checkFirmataValueNotification } from './util.js';

/**
 * HcpEmul을 wrapping 하는 에뮬레이터
 */
export class FirmataHcpEmul implements IHwEmul {
  private readonly registry_ = new PeripheralRegistry();

  constructor(
    public readonly emul: IHwEmul,
    public firmataManager: FirmataManager,
  ) {
    // empty
  }

  observePeriRegistered = (key: string): Observable<any> => {
    return this.registry_.observePeriState(key);
  };

  createPeripheral = async (
    ctx: any, // routineContext
    periId: string,
    ctor: string,
    options?: any,
  ) => {
    if (!this.registry_.exists(periId)) {
      log.debug('XXXXX FirmataHcpEmul.createPeripheral()', periId);
      await this.emul.runCmd(ctx, 'firmata', 'createPeripheral', periId, ctor, options);
      this.registry_.updateActive(periId);
    }
  };

  callPeripheral = async (
    ctx: any, // routineContext
    peripheralId: string,
    returnValue: boolean,
    functionName: string,
    ...functionArgs: Array<any>
  ) => {
    log.debug('XXXXX FirmataHcpEmul.callPeripheral()', peripheralId, functionName);
    if (!this.registry_.exists(peripheralId)) {
      log.debug('XXXXX FirmataHcpEmul.callPeripheral() 대기중', peripheralId, functionName);
      await firstValueFrom(this.observePeriRegistered(peripheralId));
    }

    log.debug('XXXXX FirmataHcpEmul.callPeripheral() 실행', peripheralId, functionName);
    return await this.emul.runCmd(
      ctx,
      'firmata',
      'callPeripheral',
      peripheralId,
      returnValue,
      functionName,
      ...functionArgs,
    );
  };

  fieldValuePeripheral = async (
    ctx: any, // routineContext
    periId: string,
    fieldName: string,
  ) => {
    log.debug('XXXXX FirmataHcpEmul.fieldValuePeripheral()', periId, fieldName);
    if (!this.registry_.exists(periId)) {
      log.debug('XXXXX FirmataHcpEmul.fieldValuePeripheral() 대기중', periId, fieldName);
      await firstValueFrom(this.observePeriRegistered(periId));
    }

    log.debug('XXXXX FirmataHcpEmul.fieldValuePeripheral() 실행', periId, fieldName);
    return await this.emul.runCmd(ctx, 'firmata', 'fieldValuePeripheral', periId, fieldName);
  };

  getLastPeriValue = async (ctx: any, periId: string, eventName?: string, valueKey?: string) => {
    if (!this.registry_.exists(periId)) {
      log.debug('XXXXX FirmataHcpEmul.getLastPeriValue() 대기중', periId, eventName);
      await firstValueFrom(this.observePeriRegistered(periId));
    }

    return await this.emul.getLastPeriValue(ctx, periId, eventName, valueKey);
  };

  runCmd = async (emulCtx: any, hwId: string, cmd: string, ...args: unknown[]) => {
    log.debug('XXXXX FirmataHcpEmul.runCmd()', hwId, cmd);
    if (hwId !== 'firmata') {
      log.warn('hwId is not firmata:', hwId);
      // return
    }

    if (cmd === 'callPeripheral') {
      const [peri, returnValue, fnName, ...fnArgs] = args;
      return this.callPeripheral(
        emulCtx,
        peri as any,
        returnValue as any,
        fnName as any,
        ...fnArgs,
      );
    }

    if (cmd === 'createPeripheral') {
      const [periId, ctor, options] = args;
      return this.createPeripheral(emulCtx, periId as string, ctor as string, options);
    }

    if (cmd === 'fieldValuePeripheral') {
      const [periId, fieldName] = args;
      return this.fieldValuePeripheral(emulCtx, periId as string, fieldName as string);
    }

    return await this.emul.runCmd(emulCtx, hwId, cmd, ...args);
  };

  ensureHwNotifications = async (
    ctx: any, // routine
    periId: string,
    eventName: string,
    interval?: number,
  ): Promise<void> => {
    const emul = this.emul;
    await firstValueFrom(
      this.observePeriRegistered(periId).pipe(
        filter((it) => it === 'active'),
        mergeMap(() => from(emul.runCmd(ctx, 'firmata', 'observe', periId, eventName, interval))),
        take(1),
      ),
    );
  };

  plot = async (
    ctx: any, // routine
    periId: string,
    eventName: string,
    interval?: number,
  ): Promise<void> => {
    this.ensureHwNotifications(ctx, periId, eventName, interval);
    await this.firmataManager.plot(ctx, periId, eventName);
  };

  observeHwNotifications = (
    ctx: any, // routine
    type: string,
    periId: string,
    intervalMs: number,
    eventName?: string, // // eventName=button__onChange
  ): Observable<FirmataValueNotification> => {
    const emul = this.emul;
    return this.observePeriRegistered(periId).pipe(
      filter((it) => it === 'active'),
      mergeMap(() => from(emul.runCmd(ctx, 'firmata', 'observe', periId, eventName))),
      switchMap(() => {
        return emul
          .observeHwNotifications(ctx, type, periId, intervalMs, eventName) //
          .pipe(
            tap((it) => {
              log.debug('FirmataHcpEmul.observeHwNotifications()', it);
            }),
          );
      }),
      map(checkFirmataValueNotification),
      filter(Boolean),
    ) as Observable<FirmataValueNotification>;
  };

  observeHwNotificationsDistinct = (
    ctx: any, // routine
    type: string, // type=firmata-value
    periId: string, // button:3
    eventName: string, // eventName=button_onChange,...
    value?: any, // value=press,hold,0,1...
  ): Observable<FirmataValueNotification> => {
    const emul = this.emul;
    return this.observePeriRegistered(periId).pipe(
      filter((it) => it === 'active'),
      mergeMap(() => from(emul.runCmd(ctx, 'firmata', 'observe', periId, eventName))),
      switchMap(() => {
        return emul
          .observeHwNotificationsDistinct(ctx, type, periId, eventName, value) //
          .pipe(
            tap((it) => {
              log.debug('FirmataHcpEmul.observeHwNotificationsDistinct()', it);
            }),
          );
      }),
      map(checkFirmataValueNotification),
      filter(Boolean),
    ) as Observable<FirmataValueNotification>;
  };

  connect = (hwId: string) => this.emul.connect(hwId);

  waitUntilConnected = () => this.emul.waitUntilConnected();
  isConnected = () => this.emul.isConnected();
  onEmulStart = () => this.emul.onEmulStart();
  onEmulStop = () => this.emul.onEmulStop();
  onEmulDestroyed = () => this.emul.onEmulDestroyed();
}
