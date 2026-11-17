import * as util from '../util';

export const dodam_analogRead = (block: any) => {
  util.updateBlockType(block, 'wise_analog_read_p');
  const field = util.updateFieldName(block, 'ardata', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'IN' + v;
  }
};
