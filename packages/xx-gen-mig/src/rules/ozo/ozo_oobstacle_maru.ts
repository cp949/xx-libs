import * as util from '../util';

const ObstacleType = {
  '0': 'FRONT',
  '2': 'FRONT_RIGHT',
  '3': 'FRONT_LEFT',
  '1': 'REAR',
  '4': 'REAR_RIGHT',
  '5': 'REAR_LEFT',
};
export const ozo_oobstacle_maru = (block: any) => {
  // 이름은 동일

  const field = util.updateFieldName(block, 'option', 'VALUE', true);
  if (field) {
    const v = field['_'];
    field['_'] = (ObstacleType as Record<string, string | undefined>)[v] ?? 'FRONT';
  }
};
