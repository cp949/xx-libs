import * as util from '../util';

export const equal_emotion_text = (block: any) => {
  util.updateBlockType(block, 'sentiment_value');
};
