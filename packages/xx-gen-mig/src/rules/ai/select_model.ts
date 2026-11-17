import * as util from '../util';

export const select_model = (block: any) => {
  util.updateBlockType(block, 'ds_knnimage_classify');
};
