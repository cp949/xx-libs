import * as util from '../util';

const LED_ACTION = {
  '1': 'ON',
  '2': 'BLINK',
  '3': 'BLINK_3',
  '4': 'BEACON',
  '5': 'BEACON_DARK',
  '6': 'DECAY',
  '7': 'PULSE_SLOW',
  '8': 'PULSE_QUICK',
};

export const ktaimk_set_led = (block: any) => {
  util.updateBlockType(block, 'codingpack_led_control');
  util.updateFieldName(block, 'duration', 'SEC', true);
  const field = util.updateFieldName(block, 'type', 'LED_ACTION', true);
  if (field) {
    const v = field['_'];
    field['_'] = (LED_ACTION as Record<string, string | undefined>)[v] ?? 'ON';
  }
};
