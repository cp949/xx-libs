import * as util from '../util';

export const controls_if_else = (block: any) => {
  util.updateBlockType(block, 'controls_if');
  util.appendMutation(block, 'else', '1');
};
