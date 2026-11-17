import * as util from '../util';

// type KwsKeywordKey = 'GIGAGENIE' | 'GENIEYA' | 'CHINGUYA' | 'JAKIYA'

export const ktaimk_set_kws_custom = (block: any) => {
  util.updateBlockType(block, 'dummy_kws_until_match_custom');
  util.updateFieldName(block, 'kws', 'KEYWORD', false);
};
