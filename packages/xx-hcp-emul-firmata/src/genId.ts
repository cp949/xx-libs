import { randomIntBelow } from './secure-random.js';

/** [min, max]에서 균등하게 정수를 뽑는다. 최댓값도 최솟값도 포함한다. */
function getRandomIntInclusive(min: number, max: number) {
  return min + randomIntBelow(max - min + 1);
}

let seq = 1;

export function genId(prefix: string): string {
  const r1 = getRandomIntInclusive(1000, 9999);
  const r2 = getRandomIntInclusive(1000, 9999);
  return `${prefix}${r1}${r2}_${++seq}`;
}
