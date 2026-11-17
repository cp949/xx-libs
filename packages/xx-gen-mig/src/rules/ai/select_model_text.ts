import * as util from '../util';

export const select_model_text = (block: any) => {
  util.updateBlockType(block, 'ds_knntext_classify');
  util.updateValueName(block, 'VALUE', 'TEXT', true);
};
