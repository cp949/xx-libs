import { firstValueFrom } from 'rxjs';
import { FirmataPlotDialogEvent } from './FirmataPlotDialogEvent.js';
import log from './log.js';

export class FirmataManager {
  plot = async (routine: any, periId: string, eventName: string): Promise<void> => {
    try {
      await firstValueFrom(FirmataPlotDialogEvent.openAndWaitForClosing(periId, eventName));
    } catch (err: any) {
      log.debug('PLOT 실패:', err.message);
    }
  };
}
