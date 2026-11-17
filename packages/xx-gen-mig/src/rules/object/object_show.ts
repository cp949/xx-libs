import * as util from '../util';

export const object_show = (block: any) => {
  util.updateBlockType(block, 'object_visible');
  util.appendField(block, 'VISIBLE', '1');
};
