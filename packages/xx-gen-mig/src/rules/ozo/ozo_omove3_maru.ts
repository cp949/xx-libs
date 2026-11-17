import * as util from '../util';

export const ozo_omove3_maru = (block: any) => {
  // 블록 이름은 동일
  util.updateValueName(block, 'value', 'DISTANCE', true);
  util.updateValueName(block, 'value2', 'SPEED', true);
};
