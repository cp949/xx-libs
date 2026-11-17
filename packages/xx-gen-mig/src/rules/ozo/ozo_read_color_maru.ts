import * as util from '../util';

export const ozo_read_color_maru = (block: any) => {
  util.updateBlockType(block, 'ozo_detect_floor_color');
  util.updateFieldName(block, 'option', 'COLOR', true);
};
