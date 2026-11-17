import * as util from '../util';

export const locationY_detect = (block: any) => {
  util.updateBlockType(block, 'object_isposition_yrange');
  util.updateValueName(block, 'move14', 'Y1', true);
  util.updateValueName(block, 'move15', 'Y2', true);
};
