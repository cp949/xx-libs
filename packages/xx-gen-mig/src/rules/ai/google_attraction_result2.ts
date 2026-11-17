import * as util from '../util';

export const google_attraction_result2 = (block: any) => {
  util.updateBlockType(block, 'landmarksdetect_get_latlng');
  util.updateFieldName(block, 'option', 'AT', true);
  const field = util.updateFieldName(block, 'option2', 'WHICH', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === 'y' ? 'lng' : 'lat';
  }
};
