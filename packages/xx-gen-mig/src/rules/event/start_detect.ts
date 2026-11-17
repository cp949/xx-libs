import * as util from '../util';

export const start_detect = (block: any) => {
  util.updateBlockType(block, 'eventloop_object_start_click');
};
