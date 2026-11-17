import * as util from '../util';

export const equal_emotion = (block: any) => {
  util.updateBlockType(block, 'facedetect_emotion_value');
  util.updateFieldName(block, 'option', 'VALUE', true);
};
