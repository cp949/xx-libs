import * as util from '../util';

export const positionX_detect = (block: any) => {
  util.updateBlockType(block, 'object_isposition_x');
  util.updateValueName(block, 'move10', 'POS', true);
};
