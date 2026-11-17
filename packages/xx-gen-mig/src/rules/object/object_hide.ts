import * as util from '../util';

export const object_hide = (block: any) => {
  util.updateBlockType(block, 'object_visible');
  util.appendField(block, 'VISIBLE', '0');
};
