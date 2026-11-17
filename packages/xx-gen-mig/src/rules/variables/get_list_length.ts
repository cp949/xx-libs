import * as util from '../util';

export const get_list_length = (block: any) => {
  util.updateBlockType(block, 'lists_custom_count');
  util.updateFieldName(block, 'list', '_USERDEFINEDLIST_', true);
};
