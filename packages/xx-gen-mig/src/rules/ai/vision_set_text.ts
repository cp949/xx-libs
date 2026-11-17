import * as util from '../util';

export const vision_set_text = (block: any) => {
  util.updateBlockType(block, 'textdetect_start');
  util.updateFieldName(block, 'option', 'MEDIA', true);
  const field = util.findFieldByName(block, 'MEDIA');
  if (field) {
    const val = field['_'];
    let newValue: string;
    if (val === '0') {
      newValue = 'CAMERA';
    } else if (val === '1') {
      newValue = 'IMAGE';
    } else {
      throw new Error('vision_set_text unknown option:' + val);
      newValue = 'CAMERA';
    }
    field['_'] = newValue;
  }
};
