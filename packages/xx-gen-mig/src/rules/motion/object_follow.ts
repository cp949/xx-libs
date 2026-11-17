import * as util from '../util';

export const object_follow = (block: any) => {
  util.updateBlockType(block, 'object_move_to_object');
  util.updateFieldName(block, 'img', '_OBJECT_', true);
};
