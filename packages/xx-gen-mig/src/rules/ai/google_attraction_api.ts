import * as util from '../util';

export const google_attraction_api = (block: any) => {
  util.updateBlockType(block, 'landmarksdetect_start');
  const field = util.updateFieldName(block, 'option', 'MEDIA', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'IMAGE' : 'CAMERA';
  }
};
