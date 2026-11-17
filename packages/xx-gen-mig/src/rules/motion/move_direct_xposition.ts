import * as util from '../util';

export const move_direct_xposition = (block: any) => {
  util.updateBlockType(block, 'object_move_x');
  util.updateValueName(block, 'move20', 'POS_X', true);
};
