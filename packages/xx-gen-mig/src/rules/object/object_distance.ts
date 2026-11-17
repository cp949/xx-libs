import * as util from '../util';

export const object_distance = (block: any) => {
  util.updateBlockType(block, 'object_get_distance');
  util.updateFieldName(block, 'img', '_OBJECT_', true);
};
