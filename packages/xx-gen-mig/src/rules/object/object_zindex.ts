import * as util from '../util';

export const object_zindex = (block: any) => {
  util.updateBlockType(block, 'object_change_zindex');
  const field = util.updateFieldName(block, 'list', 'DIRECTION', true);
  if (field) {
    const fieldValue = field['_'];
    let newValue;
    if (fieldValue === '0') {
      newValue = 'FRONT';
    } else if (fieldValue === '1') {
      newValue = 'BACK';
    } else {
      console.log(`object_zindex unknown field[list] value:  ${fieldValue}`);
      newValue = 'FRONT';
    }
    field['_'] = newValue;
  }
};
