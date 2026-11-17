import * as util from '../util';

export const all_code_stop = (block: any) => {
  util.updateBlockType(block, 'main_execution_stop');
  const field = util.updateFieldName(block, 'list', 'TARGET', true);
  if (field) {
    const val = field['_'];
    if (val === 'all') {
      field['_'] = 'ALL';
    } else if (val === 'my') {
      field['_'] = 'ME';
    } else if (val === 'other') {
      field['_'] = 'OTHER';
    } else {
      throw new Error('all_code_stop unknown field[list] value:' + val);
      field['_'] = 'ALL';
    }
  }
};
