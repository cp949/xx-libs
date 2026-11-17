import * as util from '../util';

export const get_train_api = (block: any) => {
  util.updateBlockType(block, 'subway_last_time_by_input');
  const field = util.updateFieldName(block, 'option', 'DAY', true);
  if (field) {
    const val = field['_'];
    if (val === '01') {
      field['_'] = 'NORMAL';
    } else if (val === '02') {
      field['_'] = 'SATURDAY';
    } else if (val === '03') {
      field['_'] = 'SUNDAY';
    }
  }
  util.updateFieldName(block, 'option2', 'DIRECTION', true);
  util.updateValueName(block, 'value', 'STATION_NAME', true);
};
