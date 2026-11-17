import * as util from '../util';

export const select_gan_model_show = (block: any) => {
  util.updateBlockType(block, 'gan_show_result');

  const field = util.updateFieldName(block, '', 'ACTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'HIDE' : 'SHOW';
  }
};
