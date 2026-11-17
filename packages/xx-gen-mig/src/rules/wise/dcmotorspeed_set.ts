import * as util from '../util';

export const dcmotorspeed_set = (block: any) => {
  util.updateBlockType(block, 'wise_dcmotorspeed_set');
  util.updateFieldName(block, 'l1', 'L1', true);
  util.updateFieldName(block, 'l2', 'L2', true);
  util.updateFieldName(block, 'r1', 'R1', true);
  util.updateFieldName(block, 'r1', 'R2', true);
};
