import * as util from '../util';

export const select_object = (block: any) => {
  // log.debug('mig select_object => object_select')
  util.updateBlockType(block, 'object_select');
  util.updateFieldName(block, 'img', '_OBJECT_', true);
};
