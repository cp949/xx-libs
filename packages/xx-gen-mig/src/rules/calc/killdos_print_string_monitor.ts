import * as util from '../util';

export const killdos_print_string_monitor = (block: any) => {
  util.updateBlockType(block, 'misc_chat');
  util.updateValueName(block, 'VAL', 'MSG', true);
};
