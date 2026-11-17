import * as util from '../util';

export const ktaimk_set_gpio_read = (block: any) => {
  util.updateBlockType(block, 'codingpack_gpio_read');
  util.updateFieldName(block, 'pin', 'PIN', true);
};
