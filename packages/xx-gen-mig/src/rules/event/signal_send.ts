import * as util from '../util';

export const signal_send = (block: any) => {
  util.updateBlockType(block, 'signal_send');
  util.updateFieldName(block, 'signal', '_SIGNAL_', true);
};
