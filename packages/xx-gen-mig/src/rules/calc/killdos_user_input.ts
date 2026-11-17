import * as util from '../util';

export const killdos_user_input = (block: any) => {
  util.updateBlockType(block, 'misc_prompt');
};
