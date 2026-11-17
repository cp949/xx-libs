import * as util from '../util';

const MAPPING = {
  '0': 'FACE',
  '1': 'TEXT',
  '2': 'HANDWRITE',
  '3': 'SAFESEARCH',
  '4': 'OBJECT',
};

export const vision_detect_check = (block: any) => {
  util.updateBlockType(block, 'ai_isrecognized');
  util.updateFieldName(block, 'option', 'TARGET', true);

  let field = util.findFieldByName(block, 'TARGET');
  if (field) {
    let fieldValue = field['_'];
    let newFieldValue = (MAPPING as Record<string, string | undefined>)[fieldValue];
    if (!newFieldValue) {
      newFieldValue = (MAPPING as Record<string, string | undefined>)[+fieldValue];
    }
    if (!newFieldValue) {
      throw new Error('vision_detect_check unknown value:' + fieldValue);
      newFieldValue = 'FACE';
    }
    field['_'] = newFieldValue;
  }
};
