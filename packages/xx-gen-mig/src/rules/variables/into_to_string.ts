import * as util from '../util';

export const into_to_string = (block: any) => {
  util.updateBlockType(block, 'text_custom_tostring');
  util.updateValueName(block, 'str', 'VALUE', true);
};
