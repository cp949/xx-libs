import * as util from '../util';

export const sound_set_time = (block: any, context: util.MigContext) => {
  util.updateBlockType(block, 'sound_play_async_at');
  util.updateSoundFieldName(block, 'mp3', '_SOUND_', true, context);
  util.updateValueName(block, 'VALUE', 'SEC', true);
};
