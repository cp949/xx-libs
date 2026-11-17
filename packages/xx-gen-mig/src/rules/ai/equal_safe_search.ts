import * as util from '../util';

export const equal_safe_search = (block: any) => {
  util.updateBlockType(block, 'safesearch_result_value');
  util.updateFieldName(block, 'option', 'VALUE', true);
};
