import * as util from '../util';

export const google_logo_result = (block: any) => {
  util.updateBlockType(block, 'logodetect_get_result');
  util.updateFieldName(block, 'option', 'AT', true);
};
