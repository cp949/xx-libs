import * as util from '../util';

export const google_tts_transform = (block: any) => {
  util.updateBlockType(block, 'tts_update_config');
  util.updateFieldName(block, 'gender', 'GENDER', true);
  util.updateFieldName(block, 'speed', 'SPEED', true);
  util.updateFieldName(block, 'ton', 'TONE', true);

  let field = util.findFieldByName(block, 'SPEED');
  if (field) {
    let fieldValue = field['_'];
    if (fieldValue === '0.5') {
      fieldValue = 'VERY_SLOW';
    } else if (fieldValue === '0.75') {
      fieldValue = 'SLOW';
    } else if (fieldValue === '1') {
      fieldValue = 'NORMAL';
    } else if (fieldValue === '1.25') {
      fieldValue = 'FAST';
    } else if (fieldValue === '1.5') {
      fieldValue = 'VERY_FAST';
    } else {
      fieldValue = 'NORMAL';
    }
    util.updateField(block, 'SPEED', fieldValue, true);
  }

  field = util.findFieldByName(block, 'TONE');
  if (field) {
    let fieldValue = field['_'];
    if (fieldValue === '-6') {
      fieldValue = 'VERY_LOW';
    } else if (fieldValue === '-3') {
      fieldValue = 'LOW';
    } else if (fieldValue === '0') {
      fieldValue = 'NORMAL';
    } else if (fieldValue === '3') {
      fieldValue = 'HIGH';
    } else if (fieldValue === '6') {
      fieldValue = 'VERY_HIGH';
    } else {
      fieldValue = 'NORMAL';
    }
    util.updateField(block, 'TONE', fieldValue, true);
  }
};
