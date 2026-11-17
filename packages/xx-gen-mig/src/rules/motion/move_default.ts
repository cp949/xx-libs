import * as util from '../util';

export const move_default = (block: any) => {
  util.updateBlockType(block, 'object_walk_natural');
  util.updateValueName(block, 'move1', 'DISTANCE', false);
};
