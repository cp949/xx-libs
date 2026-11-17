import * as util from '../util';

export const object_rotate2 = (block: any) => {
  util.updateBlockType(block, 'object_rotate_delta');
  util.updateValueName(block, 'move24', 'DEGREE', true);
};
