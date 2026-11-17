import * as util from '../util';

export const timer_get_value = (block: any) => {
  util.updateBlockType(block, 'object_clock_get');
};
