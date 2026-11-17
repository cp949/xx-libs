import * as util from '../util';

export const location_detect = (block: any) => {
  util.updateBlockType(block, 'object_isposition_xyrange');
  util.updateValueName(block, 'move16', 'X1', true);
  util.updateValueName(block, 'move17', 'X2', true);
  util.updateValueName(block, 'move18', 'Y1', true);
  util.updateValueName(block, 'move19', 'Y2', true);
};
