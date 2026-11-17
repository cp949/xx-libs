import * as util from '../util';

// type KwsKeywordKey = 'GIGAGENIE' | 'GENIEYA' | 'CHINGUYA' | 'JAKIYA'

export const ktaimk_detect_kws_custom = (block: any) => {
  util.updateBlockType(block, 'kws_ismatch_custom');
  util.updateFieldName(block, 'kws', 'KEYWORD', false);
};
