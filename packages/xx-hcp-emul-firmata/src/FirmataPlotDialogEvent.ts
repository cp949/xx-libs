import { Observable, Subject, filter, take } from 'rxjs';
import { genId } from './genId.js';

interface EventRequest {
  requestId: string;
  periId: string;
  eventName: string;
}

interface EventResponse {
  requestId: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

const request$ = new Subject<EventRequest>();
const response$ = new Subject<EventResponse>();

export class FirmataPlotDialogEvent {
  static open = (periId: string, eventName: string) => {
    const requestId = genId('FirmataPlotDialogEvent_');
    request$.next({
      requestId,
      periId,
      eventName,
    });
    return requestId;
  };

  static observeOpenRequest = (): Observable<EventRequest> => {
    return request$;
  };

  static onCloseDialog = (requestId: string) => {
    response$.next({
      success: true,
      requestId,
    });
  };

  static openAndWaitForClosing = (periId: string, eventName: string): Observable<any> => {
    const requestId = FirmataPlotDialogEvent.open(periId, eventName);
    return response$.pipe(
      filter((it) => it.requestId === requestId),
      take(1),
    );
  };
}
