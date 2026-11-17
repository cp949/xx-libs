import * as util from '../util';

export const ktaimk_set_assistant = (block: any) => {
  util.updateBlockType(block, 'assistant_ask');
  util.updateValueName(block, 'data', 'MSG', false);
};
