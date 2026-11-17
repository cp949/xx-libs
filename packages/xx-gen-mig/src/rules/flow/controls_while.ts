import * as util from '../util';

// controls_whileUntil과 동일한 것 같다
export const controls_while = (block: any) => {
  util.updateBlockType(block, 'controls_custom_while_until');
};
