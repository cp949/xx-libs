import * as util from '../util';

export const sound_controll = (block: any, context: util.MigContext) => {
  util.updateBlockType(block, 'update_volume');
  util.updateSoundFieldName(block, 'TEXT', 'VOLUME', true, context);
};
