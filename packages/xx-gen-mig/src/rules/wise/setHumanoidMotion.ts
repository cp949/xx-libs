import * as util from '../util';

export const setHumanoidMotion = (block: any) => {
  util.updateBlockType(block, 'wise_sethumanoid_motion');
  util.updateValueName(block, 'hdata', 'MOTION_NUM', true);
};
