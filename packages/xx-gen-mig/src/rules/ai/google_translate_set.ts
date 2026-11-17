import * as util from '../util';

export const google_translate_set = (block: any) => {
  util.updateBlockType(block, 'translate');
  util.updateFieldName(block, 'srcLang', 'SRC_LANG', true);
  util.updateFieldName(block, 'trgLang', 'DEST_LANG', true);
  util.updateValueName(block, 'targetTxt', 'TEXT', true);
};
