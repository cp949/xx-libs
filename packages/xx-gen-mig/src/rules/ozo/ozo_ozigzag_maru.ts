import * as util from '../util';

export const ozo_ozigzag_maru = (block: any) => {
  // 이름은 동일

  const field = util.updateFieldName(block, 'option', 'DIRECTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'REAR' : 'FRONT';
  }
  util.updateFieldName(block, 'option2', 'COUNT', true);
};
