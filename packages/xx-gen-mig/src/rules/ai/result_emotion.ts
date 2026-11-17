import * as util from '../util';

export const result_emotion = (block: any) => {
  util.updateBlockType(block, 'facedetect_get_emotion');
  util.updateFieldName(block, 'option', 'AT', true);
};
