import * as util from '../util';

export const move_xposition = (block: any) => {
  util.updateBlockType(block, 'object_walk_x');
  util.updateValueName(block, 'move4', 'POS_X', true);
};
