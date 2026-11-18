import { IHw } from '@cp949/xx-hcp-interface';
import { WebSerialDevice } from '../WebSerialDevice';
import { SaeonAltinoLiteControl } from './SaeonAltinoLiteControl';

export const saeonAltinoLite: IHw = {
  hwId: 'saeonAltinoLite',
  hwKind: 'serial',
  createControl: (ctx: any) => {
    const { device } = ctx as { device: WebSerialDevice };
    return new SaeonAltinoLiteControl(device);
  },
};
