import * as util from '../util';

export const position_detect = (block: any) => {
  util.updateBlockType(block, 'object_isposition_xy');
  util.updateValueName(block, 'move8', 'X', true);
  util.updateValueName(block, 'move9', 'Y', true);
};
