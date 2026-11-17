import * as util from '../util';

export const push_list_index = (block: any) => {
  util.updateBlockType(block, 'lists_custom_insertat');
  util.updateValueName(block, 'VALUE1', 'ITEM', true);
  util.updateFieldName(block, 'list', '_USERDEFINEDLIST_', true);
  util.updateValueName(block, 'VALUE2', 'AT', true);
};
