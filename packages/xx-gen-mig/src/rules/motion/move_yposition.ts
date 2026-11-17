import * as util from '../util';

export const move_yposition = (block: any) => {
  util.updateBlockType(block, 'object_walk_y');
  util.updateValueName(block, 'move5', 'POS_Y', true);
};
