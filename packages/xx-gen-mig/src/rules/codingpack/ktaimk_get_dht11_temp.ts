import * as util from '../util';

export const ktaimk_get_dht11_temp = (block: any) => {
  util.updateBlockType(block, 'codingpack_get_dht11_temp');
  util.updateFieldName(block, 'pin', 'PIN', true);
};
