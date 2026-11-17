import * as util from '../util';

export const killdos_string_contain = (block: any) => {
  util.updateBlockType(block, 'text_custom_iscontain');
  util.updateValueName(block, 'TARGET', 'TEXT1', false);
  util.updateValueName(block, 'FIND', 'TEXT2', false);
};
