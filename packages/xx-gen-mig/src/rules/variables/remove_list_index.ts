import * as util from '../util';

export const remove_list_index = (block: any) => {
  util.updateBlockType(block, 'lists_custom_removeat');
  util.updateValueName(block, 'VALUE', 'AT', true);
  util.updateFieldName(block, 'list', '_USERDEFINEDLIST_', true);
};
