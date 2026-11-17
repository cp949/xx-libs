import * as util from '../util';

export const get_sound_playtime = (block: any, context: util.MigContext) => {
  util.updateBlockType(block, 'sound_duration');
  util.updateSoundFieldName(block, 'mp3', '_SOUND_', true, context);
};
