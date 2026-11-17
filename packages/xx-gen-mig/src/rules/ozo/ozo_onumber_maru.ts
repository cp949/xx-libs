import * as util from '../util';

export const ozo_onumber_maru = (block: any) => {
  // 블록 이름은 동일

  util.updateFieldName(block, 'option', 'NUMBER', true);
};
