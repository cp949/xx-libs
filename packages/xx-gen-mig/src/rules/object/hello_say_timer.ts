import * as util from '../util';

export const hello_say_timer = (block: any) => {
  util.updateBlockType(block, 'object_say_timer');
  util.updateValueName(block, 'VALUE', 'MSG', false);
  util.updateValueName(block, 'VALUE2', 'SEC', false);
};
