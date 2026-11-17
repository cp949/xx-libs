import * as util from '../util';

export const teachable_defined = (block: any) => {
  util.updateBlockType(block, 'teachable_model_start');
  let field = util.updateFieldName(block, 'option', 'KIND', true);
  if (field) {
    const val = field['_'];
    if (val === 'image') {
      field['_'] = 'IMAGE';
    } else if (val === 'position') {
      field['_'] = 'POSE';
    } else if (val === 'sound') {
      field['_'] = 'SPEECH';
    } else {
      field['_'] = 'IMAGE';
    }
  }
  field = util.updateFieldName(block, 'option2', 'ONOFF', true);
  if (field) {
    const val = field['_'];
    if (val === 'on') {
      field['_'] = 'ON';
    } else if (val === 'off') {
      field['_'] = 'OFF';
    } else {
      field['_'] = 'ON';
    }
  }
};
