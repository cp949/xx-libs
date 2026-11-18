import { IHw } from '@cp949/xx-hcp-interface';
import { WebSerialDevice } from '../WebSerialDevice';
import { SaeonAlControl } from './SaeonAlControl';

export const saeonAl: IHw = {
  hwId: 'saeonAl',
  hwKind: 'serial',
  createControl: (ctx: any) => {
    const { device } = ctx as { device: WebSerialDevice };
    return new SaeonAlControl(device);
  },
};
