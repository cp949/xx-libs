import * as util from '../util';

export const vision_object_get = (block: any) => {
  util.updateBlockType(block, 'objectdetect_get_result');
  util.updateFieldName(block, 'option', 'AT', true);
};
