import * as util from '../util';

export const result_model = (block: any) => {
  const field = util.findFieldByName(block, 'img');
  if (field) {
    const val = field['_'];
    if (val === '0') {
      // 비디오
      util.updateBlockType(block, 'ds_knnimage_get_result');
    } else {
      // 텍스트
      util.updateBlockType(block, 'ds_knntext_get_result');
    }
  }

  // 필드는 제거
  util.removeFieldByName(block, 'img', true);
};
