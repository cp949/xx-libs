import * as util from '../util';

export const dodam_dma = (block: any) => {
  util.updateBlockType(block, 'wise_dcmotorspeed_set_angle_p');
  const field = util.updateFieldName(block, 'pin', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'OUT' + v;
  }
};
