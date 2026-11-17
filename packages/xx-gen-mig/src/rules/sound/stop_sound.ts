import * as util from '../util';

export const stop_sound = (block: any) => {
  util.updateBlockType(block, 'sound_stop');
};
