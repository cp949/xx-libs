import * as util from '../util';

export const get_train_api2 = (block: any) => {
  util.updateBlockType(block, 'subway_last_time_by_dropdown');
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
  util.updateFieldName(block, 'option3', 'STATION_NAME', true);
};
