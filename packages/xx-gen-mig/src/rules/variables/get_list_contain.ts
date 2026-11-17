import * as util from '../util';

export const get_list_contain = (block: any) => {
  util.updateBlockType(block, 'lists_custom_contains');
  util.updateFieldName(block, 'list', '_USERDEFINEDLIST_', true);
  util.updateValueName(block, 'VALUE', 'NEEDLE', true);
};
