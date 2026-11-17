import * as util from '../util';

export const signal_send_wait = (block: any) => {
  util.updateBlockType(block, 'signal_send_and_wait');
  util.updateFieldName(block, 'signal', '_SIGNAL_', true);
};
