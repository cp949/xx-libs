import * as util from '../util';

export const google_cut_api_area = (block: any) => {
  util.updateBlockType(block, 'crophint_show_cropped');
  const field = util.updateFieldName(block, 'option', 'ACTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'HIDE' : 'SHOW';
  }
};
