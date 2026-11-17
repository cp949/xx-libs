import * as util from '../util';

export const move_add_xposition = (block: any) => {
  util.updateBlockType(block, 'object_walk_dx');
  util.updateValueName(block, 'move2', 'DX', true);
};
