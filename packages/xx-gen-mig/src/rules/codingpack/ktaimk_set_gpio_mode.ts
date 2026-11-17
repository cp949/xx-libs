import * as util from '../util';

export const ktaimk_set_gpio_mode = (block: any) => {
  util.updateBlockType(block, 'codingpack_set_gpio_mode');
  util.updateFieldName(block, 'pin', 'PIN', true);
  const field = util.updateFieldName(block, 'mode', 'MODE', true);
  if (field) {
    const val = field['_'];
    if (val === '0') {
      field['_'] = 'OUTPUT';
    } else if (val === '1') {
      field['_'] = 'INPUT';
    }
  }
};
