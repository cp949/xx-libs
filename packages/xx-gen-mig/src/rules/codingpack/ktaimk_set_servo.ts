import * as util from '../util';

export const ktaimk_set_servo = (block: any) => {
  util.updateBlockType(block, 'codingpack_servo_move');
  util.updateFieldName(block, 'pin', 'PIN', true);
  util.updateValueName(block, 'VALUE', 'ANGLE', true);
};
