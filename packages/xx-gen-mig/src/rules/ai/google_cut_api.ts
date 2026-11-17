import * as util from '../util';

export const google_cut_api = (block: any) => {
  util.updateBlockType(block, 'crophint_start_detect');
  const field = util.updateFieldName(block, 'option', 'MEDIA', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'IMAGE' : 'CAMERA';
  }
};
