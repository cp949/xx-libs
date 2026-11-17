import * as util from '../util';

export const object_click_out = (block: any) => {
  util.updateBlockType(block, 'eventloop_object_mouseup');
  util.updateFieldName(block, 'img', '_OBJECT_', true);
};
