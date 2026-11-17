import * as util from '../util';

export const get_vision_position = (block: any) => {
  util.updateBlockType(block, 'facedetect_get_coordinate');
  util.updateFieldName(block, 'option', 'AT', true);
  util.updateFieldName(block, 'option2', 'LANDMARK', true);
  util.updateFieldName(block, 'option3', 'WHICH', true);

  let field = util.findFieldByName(block, 'LANDMARK');
  if (field) {
    let fieldValue = field['_'];
    if (fieldValue === '0') {
      fieldValue = 'LEFT_EYE';
    } else if (fieldValue === '1') {
      fieldValue = 'RIGHT_EYE';
    } else if (fieldValue === '6') {
      fieldValue = 'MIDPOINT_BETWEEN_EYES';
    } else if (fieldValue === '8') {
      fieldValue = 'UPPER_LIP';
    } else if (fieldValue === '9') {
      fieldValue = 'LOWER_LIP';
    } else if (fieldValue === '12') {
      fieldValue = 'MOUTH_CENTER';
    } else if (fieldValue === '15') {
      fieldValue = 'NOSE_BOTTOM_CENTER';
    } else if (fieldValue === '26') {
      fieldValue = 'LEFT_EAR_TRAGION';
    } else if (fieldValue === '27') {
      fieldValue = 'RIGHT_EAR_TRAGION';
    } else {
      fieldValue = 'LEFT_EYE';
    }
    field['_'] = fieldValue;
  }
};
