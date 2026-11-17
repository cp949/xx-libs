import * as util from '../util';

export const add_list_index = (block: any) => {
  util.updateBlockType(block, 'lists_custom_append');
  util.updateValueName(block, 'VALUE', 'ITEM', true);
  util.updateFieldName(block, 'list', '_USERDEFINEDLIST_', true);
};
