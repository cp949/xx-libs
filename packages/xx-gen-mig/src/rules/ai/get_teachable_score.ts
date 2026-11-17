import * as util from '../util';

export const get_teachable_score = (block: any) => {
  util.updateBlockType(block, 'teachable_model_get_score');
  const field = util.updateFieldName(block, 'option', 'KIND', true);
  if (field) {
    const v = field['_'];
    field['_'] = v === 'position' ? 'POSE' : v === 'sound' ? 'SPEECH' : 'IMAGE';
  }
};
