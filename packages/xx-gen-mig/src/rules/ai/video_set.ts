import * as util from '../util';

export const video_set = (block: any) => {
  util.updateBlockType(block, 'ai_video_control');
  util.updateFieldName(block, 'option', 'ACTION', true);

  let field = util.findFieldByName(block, 'ACTION');
  if (field) {
    let fieldValue = field['_'];
    if (fieldValue === '0') {
      fieldValue = 'SHOW';
    } else if (fieldValue === '1') {
      fieldValue = 'HIDE';
    } else if (fieldValue === '2') {
      fieldValue = 'INSERT';
    } else {
      fieldValue = 'SHOW';
    }
    field['_'] = fieldValue;
  }
};
