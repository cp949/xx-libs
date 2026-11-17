import * as util from '../util';

const KEYMAP = {
  '32': ' ',
  '13': 'Enter',
  '38': 'ArrowUp',
  '40': 'ArrowDown',
  '39': 'ArrowRight',
  '37': 'ArrowLeft',
  '65': 'a',
  '66': 'b',
  '67': 'c',
  '68': 'd',
  '69': 'e',
  '70': 'f',
  '71': 'g',
  '72': 'h',
  '73': 'i',
  '74': 'j',
  '75': 'k',
  '76': 'l',
  '77': 'm',
  '78': 'n',
  '79': 'o',
  '80': 'p',
  '81': 'q',
  '82': 'r',
  '83': 's',
  '84': 't',
  '85': 'u',
  '86': 'v',
  '87': 'w',
  '88': 'x',
  '89': 'y',
  '90': 'z',
};

export const start_key_detect = (block: any) => {
  util.updateBlockType(block, 'eventloop_keyboard_keydown');
  const field = util.updateFieldName(block, 'start_key', 'KEY', false);
  if (field) {
    const v = field['_'];
    field['_'] = (KEYMAP as Record<string, string | undefined>)[v] ?? ' ';
  }
};
