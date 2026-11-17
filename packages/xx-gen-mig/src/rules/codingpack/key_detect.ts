import * as util from '../util';

export const key_detect = (block: any) => {
  util.updateBlockType(block, 'codingpack_detect_keydown');
  util.updateFieldName(block, 'key', 'KEY', true);
};
