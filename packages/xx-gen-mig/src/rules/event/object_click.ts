import * as util from '../util';

export const object_click = (block: any) => {
  util.updateBlockType(block, 'eventloop_object_mousedown');
  util.updateFieldName(block, 'img', '_OBJECT_', true);
};
