import * as util from '../util';

export const img_change = (block: any) => {
  util.updateBlockType(block, 'object_change_shape');
  util.updateFieldName(block, 'img2', '_OBJECT_', true);
};
