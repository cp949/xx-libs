function getRandomIntInclusive(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // 최댓값도 포함, 최솟값도 포함
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let seq = 1;

export function genId(prefix: string): string {
  const r1 = getRandomIntInclusive(1000, 9999);
  const r2 = getRandomIntInclusive(1000, 9999);
  return `${prefix}${r1}${r2}_${++seq}`;
}
