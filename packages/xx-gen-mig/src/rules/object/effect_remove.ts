import * as util from '../util';

export const effect_remove = (block: any) => {
  util.updateBlockType(block, 'object_effect_clear');
};
