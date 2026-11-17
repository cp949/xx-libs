import * as util from '../util';

export const timer_set = (block: any) => {
  util.updateBlockType(block, 'object_clock_start');
  const field = util.updateFieldName(block, 'list', 'VALUE', true);
  if (field) {
    const val = field['_'];
    if (val === 'start') {
      field['_'] = 'START';
    } else if (val === 'stop') {
      field['_'] = 'STOP';
    } else if (val === 'init') {
      field['_'] = 'RESTART';
    } else {
      throw new Error('unknown option timer_set:' + val);
      field['_'] = 'START';
    }
  }
};
