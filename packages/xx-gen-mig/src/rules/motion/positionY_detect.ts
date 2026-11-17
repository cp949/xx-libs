import * as util from '../util';

export const positionY_detect = (block: any) => {
  util.updateBlockType(block, 'object_isposition_y');
  util.updateValueName(block, 'move11', 'POS', true);
};
