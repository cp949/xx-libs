import * as util from '../util';

export const ktaimk_api_json = (block: any) => {
  util.updateBlockType(block, 'externapi_call');
  util.updateFieldName(block, 'apiName', '_EXAPI_', true);
  util.updateFieldName(block, 'type', 'RESULT_TYPE', true);
};
