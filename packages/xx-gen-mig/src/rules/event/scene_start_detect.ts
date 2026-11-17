import * as util from '../util';

export const scene_start_detect = (block: any) => {
  util.updateBlockType(block, 'eventloop_object_scene_started');
};
