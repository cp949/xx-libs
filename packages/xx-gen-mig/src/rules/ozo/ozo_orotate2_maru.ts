import * as util from '../util';

export const ozo_orotate2_maru = (block: any) => {
  // 블록이름 변경없음

  let field = util.updateFieldName(block, 'option', 'DIRECTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'CCW' : 'CW';
  }

  field = util.updateFieldName(block, 'option', 'ROTATION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'HALF' : 'ONE';
  }
};
