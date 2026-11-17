import * as util from '../util';

export const image_set = (block: any) => {
  util.updateBlockType(block, 'ai_image_control');
  util.updateFieldName(block, 'option', 'ACTION', true);

  let field = util.findFieldByName(block, 'ACTION');
  if (field) {
    let fieldValue = field['_'];
    if (fieldValue === '0') {
      fieldValue = 'ADD';
    } else if (fieldValue === '1') {
      fieldValue = 'REMOVE';
    } else {
      fieldValue = 'ADD';
    }
    util.updateField(block, 'ACTION', fieldValue, true);
  }
};
