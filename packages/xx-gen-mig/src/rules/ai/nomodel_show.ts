import * as util from '../util';

// 숨기기가 있겠나, 그냥 다 보이기로
export const nomodel_show = (block: any) => {
  util.updateBlockType(block, 'kmeans_show_plot');
  const field = util.updateFieldName(block, 'option', '_KMEANS_MODEL_', true);
};
