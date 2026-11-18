import { IHw } from '@cp949/xx-hcp-interface';
import { WebSerialDevice } from '../WebSerialDevice';
import { WiseXboardControl } from './WiseXboardControl';

export const wiseXboard: IHw = {
  hwId: 'wiseXboard',
  hwKind: 'serial',
  createControl: (ctx: any) => {
    const { device } = ctx as { device: WebSerialDevice };
    return new WiseXboardControl(device);
  },
};
