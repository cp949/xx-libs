import * as util from '../util';

export const vision_object_set = (block: any) => {
  util.updateBlockType(block, 'objectdetect_show_result');
  util.updateFieldName(block, 'option', 'ACTION', true);
  const field = util.findFieldByName(block, 'ACTION');
  if (field) {
    const val = field['_'];
    let newValue: string;
    if (val === '0') {
      newValue = 'SHOW';
    } else if (val === '1') {
      newValue = 'HIDE';
    } else {
      throw new Error('vision_object_set unknown option:' + val);
      newValue = 'SHOW';
    }
    field['_'] = newValue;
  }
};
