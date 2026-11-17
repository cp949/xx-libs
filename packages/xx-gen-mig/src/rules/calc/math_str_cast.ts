import * as util from '../util';

export const math_str_cast = (block: any) => {
  util.updateBlockType(block, 'math_string_to_number');
  util.updateValueName(block, 'str', 'VALUE', true);
};
