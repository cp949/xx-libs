import { Observable, Subject, filter } from 'rxjs';
import { IHcpHwNotification, IHcpNotification } from './hw';

const eventData$ = new Subject<IHcpNotification>();

const HW_TYPES = new Set(['firmata-value']);

export class HcpNotificationEvent {
  static send = (data: IHcpNotification) => {
    eventData$.next(data);
  };

  static observe = (): Observable<IHcpNotification> => {
    return eventData$;
  };

  static observeHwNotification = (): Observable<IHcpHwNotification> => {
    return eventData$.pipe(filter((it) => HW_TYPES.has(it.type))) as Observable<IHcpHwNotification>;
  };
}
