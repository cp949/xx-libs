import * as util from '../util';

export const get_string_length = (block: any) => {
  util.updateBlockType(block, 'text_length');
  util.updateValueName(block, 'TARGET', 'VALUE', true);
};
