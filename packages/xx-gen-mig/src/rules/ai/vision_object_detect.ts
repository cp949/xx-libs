import * as util from '../util';

export const vision_object_detect = (block: any) => {
  util.updateBlockType(block, 'objectdetect_start');
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
      throw new Error('vision_object_detect unknown option:' + val);
      newValue = 'CAMERA';
    }
    field['_'] = newValue;
  }
};
