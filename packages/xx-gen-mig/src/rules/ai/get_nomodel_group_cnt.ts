import * as util from '../util';

// 기존 블록과 호환되지 않음, 이름만 바꾸는게 최선
export const get_nomodel_group_cnt = (block: any) => {
  util.updateBlockType(block, 'kmeans_group_count');
};
