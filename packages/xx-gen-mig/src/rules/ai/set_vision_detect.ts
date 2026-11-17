import * as util from '../util';

export const set_vision_detect = (block: any) => {
  util.updateBlockType(block, 'facedetect_show_result');
  const field = util.updateFieldName(block, 'option2', 'ACTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === '1' ? 'HIDE' : 'SHOW';
  }
};
