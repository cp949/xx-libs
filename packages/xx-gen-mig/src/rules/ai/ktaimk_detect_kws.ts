import * as util from '../util';

// type KwsKeywordKey = 'GIGAGENIE' | 'GENIEYA' | 'CHINGUYA' | 'JAKIYA'

export const ktaimk_detect_kws = (block: any) => {
  util.updateBlockType(block, 'kws_ismatch');
  const field = util.updateFieldName(block, 'kws', 'KEYWORD', false);
  if (field) {
    const old = field['_'];
    let fieldValue = 'GENIEYA';
    if (old === '0') fieldValue = 'GIGAGENIE';
    if (old === '1') fieldValue = 'GENIEYA';
    if (old === '2') fieldValue = 'CHINGUYA';
    if (old === '3') fieldValue = 'JAKIYA';
    else fieldValue = 'GENIEYA';
    field['_'] = fieldValue;
  }
};
