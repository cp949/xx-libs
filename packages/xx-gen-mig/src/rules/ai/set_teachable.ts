import * as util from '../util';

export const set_teachable = (block: any) => {
  util.updateBlockType(block, 'teachable_model_set_url');
  util.updateValueName(block, 'value', 'URL', true);
  const field = util.updateFieldName(block, 'option', 'KIND', true);
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
};
