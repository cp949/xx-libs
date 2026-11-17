import * as util from '../util';

const Direction = {
  '0': 'FRONT',
  '1': 'REAR',
};
export const Speed = {
  '1': 'SLOW',
  '2': 'NORMAL',
  '3': 'FAST',
  '4': 'VERY_FAST',
};
const updateDirectionField = (field: any) => {
  if (!field) return;
  const v = field['_'];
  field['_'] = (Direction as Record<string, string | undefined>)[v] ?? 'FRONT';
};

const updateSpeedField = (field: any) => {
  if (!field) return;
  const v = field['_'];
  field['_'] = (Speed as Record<string, string | undefined>)[v] ?? 'NORMAL';
};

export const ozo_omove1_maru = (block: any) => {
  // 블록 이름은 동일

  let field = util.updateFieldName(block, 'option', 'LEFT_DIRECTION', true);
  updateDirectionField(field);

  field = util.updateFieldName(block, 'option2', 'LEFT_SPEED', true);
  updateSpeedField(field);

  field = util.updateFieldName(block, 'option3', 'RIGHT_DIRECTION', true);
  updateDirectionField(field);

  field = util.updateFieldName(block, 'option4', 'RIGHT_SPEED', true);
  updateSpeedField(field);
};
