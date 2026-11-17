import * as util from '../util';

export const google_ta_api = (block: any) => {
  util.updateBlockType(block, 'assistant_ask');
  util.updateFieldName(block, 'srcLang', 'LANG', true);
  util.updateValueName(block, 'targetTxt', 'MSG', true);
};
