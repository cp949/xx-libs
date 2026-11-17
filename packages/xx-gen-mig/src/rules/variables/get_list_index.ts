import * as util from '../util';

export const get_list_index = (block: any) => {
  util.updateBlockType(block, 'lists_custom_itemat');
  util.updateFieldName(block, 'list', '_USERDEFINEDLIST_', true);
  util.updateValueName(block, 'VALUE', 'AT', true);
};
