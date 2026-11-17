import * as util from '../util';

export const ktaimk_set_stt = (block: any) => {
  util.updateBlockType(block, 'stt');
  util.updateFieldName(block, 'langCd', 'LANG', false);
};
