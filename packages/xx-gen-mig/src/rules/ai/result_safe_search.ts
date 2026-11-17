import * as util from '../util';

export const result_safe_search = (block: any) => {
  util.updateBlockType(block, 'safesearch_get_result');
};
