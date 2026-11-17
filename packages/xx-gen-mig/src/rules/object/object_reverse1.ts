import * as util from '../util';

export const object_reverse1 = (block: any) => {
  util.updateBlockType(block, 'object_flip');
  util.appendField(block, 'DIRECTION', 'VERTICAL');
};
