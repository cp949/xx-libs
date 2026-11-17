import * as util from '../util';

export const analy_model_example = (block: any) => {
  util.updateBlockType(block, 'ds_simpleregress_regress_predict');
  util.updateValueName(block, 'value', 'VALUE', true);
};
