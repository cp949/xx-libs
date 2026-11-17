import * as util from '../util';

export const ktaimk_tts_wait = (block: any) => {
  util.updateBlockType(block, 'tts_play_text');
  util.updateFieldName(block, 'lang', 'LANG', false);
  util.updateValueName(block, 'DATA', 'TEXT', true);
};
