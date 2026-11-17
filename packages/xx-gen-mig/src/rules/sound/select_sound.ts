import * as util from '../util';

export const select_sound = (block: any, context: util.MigContext) => {
  util.updateBlockType(block, 'sound_play_async');
  util.updateSoundFieldName(block, 'mp3', '_SOUND_', true, context);
};
