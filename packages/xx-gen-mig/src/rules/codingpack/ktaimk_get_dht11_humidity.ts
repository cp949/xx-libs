import * as util from '../util';

export const ktaimk_get_dht11_humidity = (block: any) => {
  util.updateBlockType(block, 'codingpack_get_dht11_humi');
  util.updateFieldName(block, 'pin', 'PIN', true);
};
