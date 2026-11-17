import * as util from '../util';

export const locationX_detect = (block: any) => {
  util.updateBlockType(block, 'object_isposition_xrange');
  util.updateValueName(block, 'move12', 'X1', true);
  util.updateValueName(block, 'move13', 'X2', true);
};
