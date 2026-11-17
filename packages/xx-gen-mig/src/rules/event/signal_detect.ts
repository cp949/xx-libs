import * as util from '../util';

export const signal_detect = (block: any) => {
  util.updateBlockType(block, 'eventloop_signal_detect');
  util.updateFieldName(block, 'signal', '_SIGNAL_', true);
};
