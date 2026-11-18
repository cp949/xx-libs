import { randomIntBelow } from './secure-random.js';

// 시작 값만 난수다. 모듈을 불러올 때가 아니라 첫 호출 때 뽑아, crypto가 없는 환경에서도 import는 된다.
let seq: number | undefined;

export function genId(prefix: string): string {
  if (seq === undefined) seq = randomIntBelow(10000);
  return prefix + (seq++).toString(36).replace('-', '_');
}
