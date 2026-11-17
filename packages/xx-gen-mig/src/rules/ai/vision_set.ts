import * as util from '../util';

export const vision_set = (block: any) => {
  util.updateBlockType(block, 'facedetect_start');
  util.updateFieldName(block, 'option', 'MEDIA', true);
  let field = util.findFieldByName(block, 'MEDIA');
  if (field) {
    let fieldValue = field['_'];
    if (fieldValue === '0') {
      fieldValue = 'CAMERA';
    } else if (fieldValue === '1') {
      fieldValue = 'IMAGE';
    } else {
      fieldValue = 'CAMERA';
    }
    field['_'] = fieldValue;
  }
};
