import { FirmataValueNotification } from './FirmataValueNotification.js';
import log from './log.js';

export function checkFirmataValueNotification(payload: any): FirmataValueNotification | undefined {
  if (!payload) return undefined;
  const { type, kind } = payload;
  if (type !== 'firmata-value') return undefined;
  if (kind) {
    return payload as FirmataValueNotification;
  }

  log.warn('unknown firmata-value notification:', payload);
  return undefined;
}
