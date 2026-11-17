import * as util from '../util';

export const mouse_click = (block: any) => {
  util.updateBlockType(block, 'eventloop_object_bg_mousedown');
};
