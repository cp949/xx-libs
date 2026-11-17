import * as util from '../util';

export const vision_get_direct_text = (block: any) => {
  util.updateBlockType(block, 'textdetect_handwrite_get_result');
  util.updateFieldName(block, 'option', 'AT', true);
};
