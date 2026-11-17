import { start_detect } from './start_detect';
import { start_key_detect } from './start_key_detect';
import { mouse_click } from './mouse_click';
import { mouse_click_out } from './mouse_click_out';
import { object_click } from './object_click';
import { object_click_out } from './object_click_out';
import { scene_start_detect } from './scene_start_detect';
import { signal_detect } from './signal_detect';
import { signal_send } from './signal_send';
import { signal_send_wait } from './signal_send_wait';
import { next_scene } from './next_scene';
import { select_scene } from './select_scene';

export const event = {
  start_detect,
  start_key_detect,
  mouse_click,
  mouse_click_out,
  object_click,
  object_click_out,
  scene_start_detect,
  signal_detect,
  signal_send,
  signal_send_wait,
  next_scene,
  select_scene,
};
