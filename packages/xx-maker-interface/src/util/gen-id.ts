let seq_ = 0;

// dont care non atomic
const nextSeq = () => {
  seq_ = (seq_ % 20_000_000) + 1;
  return seq_;
};

const randomId = function (length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
};

function genId_(prefix: string, length = 6) {
  return prefix + randomId(length);
}

const _MIN_LEN = 6;

const FALSE_FN = () => false;

export function genId(prefix: string, existing: (id: string) => boolean = FALSE_FN) {
  let id = genId_(prefix, _MIN_LEN);
  if (!existing(id)) return id;

  const prefix2 = `${prefix}${nextSeq()}`;
  id = genId_(prefix2, _MIN_LEN);
  if (!existing(id)) return id;

  for (let i = _MIN_LEN + 1; i < 16; i++) {
    id = genId_(prefix2, i);
    if (!existing(id)) return id;
  }
  throw new Error('genIdAuto() fail');
}
