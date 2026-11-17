import * as util from '../util';

export const move_xy_position = (block: any) => {
  util.updateBlockType(block, 'object_walk_xy');
  util.updateValueName(block, 'move5_1', 'POS_X', true);
  util.updateValueName(block, 'move5_2', 'POS_Y', true);
};
