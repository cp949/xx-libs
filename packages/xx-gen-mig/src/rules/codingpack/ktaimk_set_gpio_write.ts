import * as util from '../util';

export const ktaimk_set_gpio_write = (block: any) => {
  util.updateBlockType(block, 'codingpack_gpio_write');
  util.updateFieldName(block, 'pin', 'PIN', true);
  util.updateFieldName(block, 'value', 'VALUE', true);
};
