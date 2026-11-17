import * as util from '../util';

export const result_api_get_index = (block: any) => {
  util.updateBlockType(block, 'externapi_get_result_at');
  util.updateValueName(block, 'result', 'API_RESULT', true);
  util.updateValueName(block, 'key', 'KEY', true);
  util.updateValueName(block, 'index', 'AT', true);
};
