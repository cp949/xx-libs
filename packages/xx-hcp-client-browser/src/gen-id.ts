let seq = Math.floor(Math.random() * 10000);

export function genId(prefix: string): string {
  return prefix + (seq++).toString(36).replace('-', '_');
}
