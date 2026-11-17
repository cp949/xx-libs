import * as util from '../util';

export const reset_code = (block: any) => {
  util.updateBlockType(block, 'main_execution_restart');
};
