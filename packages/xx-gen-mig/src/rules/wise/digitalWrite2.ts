import * as util from '../util';

export const digitalWrite2 = (block: any) => {
  util.updateBlockType(block, 'wise_digital_write');
  util.updateValueName(block, 'dwdata', 'VALUE', true);
  const field = util.updateFieldName(block, 'dwport', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'OUT' + v;
  }
};
