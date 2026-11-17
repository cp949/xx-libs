import * as util from '../util';

export const object_controll = (block: any) => {
  // log.debug('mig select_object => object_select')
  util.updateBlockType(block, 'object_onoff_control');
  const field = util.updateFieldName(block, 'object_controll', 'VALUE', true);
  if (field) {
    const val = field['_'];
    let newFieldValue = 'ON';
    if (val === '0') {
      newFieldValue = 'OFF';
    } else if (val === '1') {
      newFieldValue = 'ON';
    } else {
      throw new Error(`object_controll unknown field value: ${val}`);
    }
    field['_'] = newFieldValue;
  }
};
