import * as util from '../util';

const EffectKind = {
  '0': 'brightness',
  '1': 'contrast',
  '2': 'saturation',
  '3': 'hue',
  '4': 'noise',
  '5': 'pixelate',
  '6': 'blur',
};

export const effect_select = (block: any) => {
  util.updateBlockType(block, 'object_effect_set');
  let field = util.updateFieldName(block, 'list', 'KIND', true);
  let effect = '';
  if (field) {
    const v = field['_'];
    field['_'] = (EffectKind as Record<string, string | undefined>)[v] ?? 'brightness';
    effect = field['_'];
  }
};
