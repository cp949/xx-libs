import * as util from '../util';

export const get_text_info = (block: any) => {
  util.updateBlockType(block, 'textdetect_get_result');
  util.updateFieldName(block, 'option', 'AT', true);
};
