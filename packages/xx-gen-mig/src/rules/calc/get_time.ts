import * as util from '../util';

export const get_time = (block: any) => {
  util.updateBlockType(block, 'math_current_time');
};
