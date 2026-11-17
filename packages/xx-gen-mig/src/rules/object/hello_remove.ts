import * as util from '../util';

export const hello_remove = (block: any) => {
  util.updateBlockType(block, 'object_say_clear');
  util.removeFieldByName(block, 'list', true);
};
