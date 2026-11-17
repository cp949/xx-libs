import * as util from '../util';

export const ozo_orotate1_maru = (block: any) => {
  // 블록이름 변경없음

  util.updateValueName(block, 'value', 'DEGREE', true);
  const field = util.updateFieldName(block, 'option', 'DIRECTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'CCW' : 'CW';
  }
};
