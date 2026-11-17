import * as util from '../util';

export const get_detect_length = (block: any) => {
  util.updateBlockType(block, 'facedetect_get_result_count');
  const field = util.updateFieldName(block, 'option', 'TARGET', true);
  if (field) {
    let fieldValue = field['_'];

    // 옵션에 얼굴밖에 없음
    if (fieldValue === '0') {
      fieldValue = 'FACE';
    } else {
      fieldValue = 'FACE';
    }
    field['_'] = fieldValue;
  }
};
