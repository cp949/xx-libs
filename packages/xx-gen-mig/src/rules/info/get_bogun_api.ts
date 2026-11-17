import * as util from '../util';

export const get_bogun_api = (block: any) => {
  util.updateBlockType(block, 'bogun_by_input');
  util.updateFieldName(block, 'option', 'DAY', true);
  util.updateFieldName(block, 'option2', 'API_TYPE', true);
  util.updateValueName(block, 'value', 'CITY', true);
};
