import * as util from '../util';

export const select_gan_model = (block: any) => {
  let field = util.updateFieldName(block, 'option', 'MEDIA', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === 'image' ? 'IMAGE' : 'CAMERA';
  }

  field = util.findFieldByName(block, 'option2');
  if (field) {
    const v = field['_'];
    if (v === 'animation') {
      util.updateBlockType(block, 'gan_anim_start');
    } /* if (v === 'Style') */ else {
      if (v !== 'Style') {
        console.warn('unknown gan style:' + v);
      }
      util.updateBlockType(block, 'gan_style_transfer_start');
      util.updateFieldName(block, 'value', 'STYLE', true);
    }
  }
};
