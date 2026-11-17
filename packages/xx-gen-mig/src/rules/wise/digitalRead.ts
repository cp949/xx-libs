import * as util from '../util';

export const digitalRead = (block: any) => {
  util.updateBlockType(block, 'wise_digital_read');
  const field = util.updateFieldName(block, 'drdata', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'IN' + v;
  }
};
