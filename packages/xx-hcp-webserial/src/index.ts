export * from './hw/DelimiterParser';
export * from './hw/InterByteTimeoutParser';
export * from './hw/WebSerialDevice';
import { IHw } from '@cp949/xx-hcp-interface';
import { exMarsCube } from './hw/exMarsCube';
import { saeonAl } from './hw/saeonAl';
import { saeonAltinoLite } from './hw/saeonAltinoLite';
import { wiseXboard } from './hw/wiseXboard';
import { wiseXboardPremium } from './hw/wiseXboardPremium';

export const webSerialHardwares: IHw[] = [
  wiseXboard, //
  wiseXboardPremium,
  exMarsCube,
  saeonAltinoLite,
  saeonAl,
];

export const webSerialHardwareMap: Record<string, IHw> = webSerialHardwares.reduce(
  (acc, cur) => {
    acc[cur.hwId] = cur;
    return acc;
  },
  {} as Record<string, IHw>,
);
