import * as util from '../util';

export const object_detect = (block: any) => {
  util.updateBlockType(block, 'object_iscollision');
  util.updateFieldName(block, 'img', '_OBJECTCOLLISION_', true);
};
