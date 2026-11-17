import * as util from '../util';

export const move_add_yposition = (block: any) => {
  util.updateBlockType(block, 'object_walk_dy');
  util.updateValueName(block, 'move3', 'DY', true);
};
