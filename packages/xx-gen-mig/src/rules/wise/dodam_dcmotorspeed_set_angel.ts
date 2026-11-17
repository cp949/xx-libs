import * as util from '../util';

export const dodam_dcmotorspeed_set_angel = (block: any) => {
  util.updateBlockType(block, 'wise_dcmotorspeed_set_angle_p');
  util.updateValueName(block, 'angel', 'ANGLE', true);
  const field = util.updateFieldName(block, 'pin', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'OUT' + v;
  }
};
