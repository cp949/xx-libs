import * as util from '../util';

export const kws_module = (block: any) => {
  util.updateBlockType(block, 'kws_loop');
  util.updateFieldName(block, 'kws', 'KEYWORD', true);
};
