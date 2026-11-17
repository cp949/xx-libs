import * as util from '../util';

// ktaimk_tts_wait과 동일하게 만든다
// 예전에 있었던 블록인듯하다
export const ktaimk_tts = (block: any) => {
  util.updateBlockType(block, 'tts_play_text');
  util.updateFieldName(block, 'lang', 'LANG', false);
  util.updateValueName(block, 'DATA', 'TEXT', true);
};
