import * as util from '../util';

export const move_direct_yposition = (block: any) => {
  util.updateBlockType(block, 'object_move_y');
  util.updateValueName(block, 'move21', 'POS_Y', true);
};
