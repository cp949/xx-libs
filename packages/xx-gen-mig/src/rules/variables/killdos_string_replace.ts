import * as util from '../util';

export const killdos_string_replace = (block: any) => {
  util.updateBlockType(block, 'text_custom_replace');
  util.updateValueName(block, 'TARGET', 'TEXT', false);
  util.updateValueName(block, 'FIND', 'FROM', false);
  util.updateValueName(block, 'REPLACE', 'TO', false);
};
