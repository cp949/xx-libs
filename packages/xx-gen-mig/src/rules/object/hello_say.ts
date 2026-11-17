import * as util from '../util';

export const hello_say = (block: any) => {
  // log.debug('mig select_object => object_select')
  util.updateBlockType(block, 'object_say_keep');
  util.updateValueName(block, 'VALUE', 'MSG', true);
  util.removeFieldByName(block, 'list', true);
};
