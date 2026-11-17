import { ai } from './ai';
import { calc } from './calc';
import { codingpack } from './codingpack';
import { event } from './event';
import { flow } from './flow';
import { info } from './info';
import { motion } from './motion';
import { object } from './object';
import { ozo } from './ozo';
import { sound } from './sound';
import { variables } from './variables';
import { wise } from './wise';

// 마이그래이션을 무시할 블록
export { default as ignoreBlocks } from './ignore-blocks';

export const rules = {
  ...ai,
  ...event,
  ...motion,
  ...object,
  ...sound,
  ...codingpack,
  ...flow,
  ...calc,
  ...variables,
  ...info,
  ...wise,
  ...ozo,
};
