import * as util from '../util';

export const next_scene = (block: any) => {
  util.updateBlockType(block, 'object_change_scene_next');
  const field = util.updateFieldName(block, 'list', 'DIRECTION', true);
  if (field) {
    const fieldValue = field['_'] === '0' ? 'NEXT' : 'PREV';
    util.updateField(block, 'DIRECTION', fieldValue, true);
  }
};
