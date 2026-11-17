import * as util from '../util';

export const move_direct_add_yposition = (block: any) => {
  util.updateBlockType(block, 'object_move_dy');
  util.updateValueName(block, 'move23', 'DY', true);
};
