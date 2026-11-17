import * as util from '../util';

export const result_api_get = (block: any) => {
  util.updateBlockType(block, 'externapi_get_result');
  util.updateValueName(block, 'result', 'API_RESULT', true);
  util.updateValueName(block, 'key', 'KEY', true);
};
