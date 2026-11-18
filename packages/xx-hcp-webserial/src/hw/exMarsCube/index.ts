import { IHw } from '@cp949/xx-hcp-interface';
import { WebSerialDevice } from '../WebSerialDevice';
import { ExMarsCubeControl } from './ExMarsCubeControl';

export const exMarsCube: IHw = {
  hwId: 'exMarsCube',
  hwKind: 'serial',
  createControl: (ctx: any) => {
    const { device } = ctx as { device: WebSerialDevice };
    return new ExMarsCubeControl(device);
  },
};
