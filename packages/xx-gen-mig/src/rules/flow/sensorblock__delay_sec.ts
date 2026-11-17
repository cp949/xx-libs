import * as util from '../util';

const valueOf = (block: any): any | undefined => {
  if (!block['value']) return undefined;

  const values = block['value'] as any[];
  const times = values.find((it) => it['$']['name'] === 'TIMES');
  if (!times || !times['block']) return undefined;
  const blocks = times['block'] as any[];
  const math_number = blocks.find((it) => it['$']['type'] === 'math_number');
  if (!math_number || !math_number['field']) return undefined;
  const nums = math_number['field'] as any[];
  const num = nums.find((it) => it['$']['name'] === 'NUM');
  if (num) {
    return num['_'];
  }
  return undefined;
};

const removeValueTag = (block: any) => {
  const values = block['value'] as any[];
  const idx = values.findIndex((it) => it['$']['name'] === 'TIMES');
  if (idx >= 0) {
    delete values[idx];
  }
};

export const sensorblock__delay_sec = (block: any) => {
  util.updateBlockType(block, 'misc_sleep');
  util.appendField(block, 'TIMEUNIT', 'SECOND');
  util.appendField(block, 'AMOUNT', valueOf(block));
  removeValueTag(block);
};
