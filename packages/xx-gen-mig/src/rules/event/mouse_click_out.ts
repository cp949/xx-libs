import * as util from '../util';

export const mouse_click_out = (block: any) => {
  util.updateBlockType(block, 'eventloop_object_bg_mouseup');
};
