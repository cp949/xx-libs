import * as util from '../util';

export const string_change_class = (block: any) => {
  util.updateBlockType(block, 'text_changeCase');
  util.updateValueName(block, 'TARGET', 'TEXT', true);
  const field = util.updateFieldName(block, 'list', 'CASE', true);
  if (field) {
    const val = field['_'];
    if (val === '0') {
      field['_'] = 'UPPERCASE';
    } else if (val === '1') {
      field['_'] = 'LOWERCASE';
    } else {
      throw new Error('string_change_class unknown field[list] value:' + val);
    }
  }
};
