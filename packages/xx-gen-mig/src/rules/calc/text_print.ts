import * as util from '../util';

export const text_print = (block: any) => {
  util.updateBlockType(block, 'misc_alert');
  util.updateValueName(block, 'TEXT', 'MSG', true);
};
