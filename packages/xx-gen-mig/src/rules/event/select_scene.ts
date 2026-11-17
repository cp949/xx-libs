import * as util from '../util';

export const select_scene = (block: any) => {
  util.updateBlockType(block, 'object_change_scene');
  util.updateFieldName(block, 'list', '_SCENE_', true);
};
