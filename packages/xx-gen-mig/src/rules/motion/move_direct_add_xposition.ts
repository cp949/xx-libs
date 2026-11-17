import * as util from '../util';

export const move_direct_add_xposition = (block: any) => {
  util.updateBlockType(block, 'object_move_dx');
  util.updateValueName(block, 'move22', 'DX', true);
};
