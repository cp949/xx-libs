import * as util from '../util';

export const ktaimk_dataset = (block: any) => {
  util.updateBlockType(block, 'dataset_search');
  util.updateFieldName(block, 'DATASET', '_USERDATASET_', true);
  util.updateValueName(block, 'KEY', 'QUERY', true);
};
