import * as util from '../util';

// 기존 블록과 호환되지 않음, 이름만 바꾸는게 최선
export const get_nomodel_location = (block: any) => {
  util.updateBlockType(block, 'kmeans_group_center_value');
};
