import * as util from '../util';

export const timer_display = (block: any) => {
  util.updateBlockType(block, 'object_clock_visible');
  const field = util.updateFieldName(block, 'list', 'VALUE', true);
  if (field) {
    const val = field['_'];
    if (val === '0') {
      field['_'] = 'SHOW';
    } else if (val === '1') {
      field['_'] = 'HIDE';
    } else {
      throw new Error('unknown option timer_display:' + val);
    }
  }
};
