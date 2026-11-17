import * as util from '../util';

export const object_scale = (block: any) => {
  util.updateBlockType(block, 'object_change_size');
  util.updateFieldName(block, 'scale', 'PERCENT', true);
};
