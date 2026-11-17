import * as util from '../util';

export const google_attraction_result = (block: any) => {
  util.updateBlockType(block, 'landmarksdetect_get_title');
  util.updateFieldName(block, 'option', 'AT', true);
};
