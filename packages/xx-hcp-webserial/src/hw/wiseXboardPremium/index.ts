import { IHw } from '@cp949/xx-hcp-interface';
import { WebSerialDevice } from '../WebSerialDevice';
import { WiseXboardPremiumControl } from './WiseXboardPremiumControl';

export const wiseXboardPremium: IHw = {
  hwId: 'wiseXboardPremium',
  hwKind: 'serial',
  createControl: (ctx: any) => {
    const { device } = ctx as { device: WebSerialDevice };
    return new WiseXboardPremiumControl(device);
  },
};
