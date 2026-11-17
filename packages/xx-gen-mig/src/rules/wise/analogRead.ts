import * as util from '../util';

export const analogRead = (block: any) => {
  util.updateBlockType(block, 'wise_analog_read');
  const field = util.updateFieldName(block, 'ardata', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'IN' + v;
  }
};
