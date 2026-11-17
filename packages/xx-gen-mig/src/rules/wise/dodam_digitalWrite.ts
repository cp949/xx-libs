import * as util from '../util';

export const dodam_digitalWrite = (block: any) => {
  util.updateBlockType(block, 'wise_digital_write_p');
  util.updateValueName(block, 'dwdata', 'VALUE', true);
  const field = util.updateFieldName(block, 'dwport', 'PIN', true);
  if (field) {
    const v = field['_'];
    field['_'] = 'OUT' + v;
  }
};
