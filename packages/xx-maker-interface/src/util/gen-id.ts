let seq_ = 0;

// dont care non atomic
const nextSeq = () => {
  seq_ = (seq_ % 20_000_000) + 1;
  return seq_;
};

/**
 * `globalThis.crypto.getRandomValues`를 쓸 수 없는 환경에서 던지는 오류.
 * 다른 난수원으로 대체하지 않으므로 호출자는 이 오류로 미지원 환경을 구분한다.
 * `@cp949/random`의 같은 이름 클래스에서 옮겼다.
 */
export class SecureRandomUnavailableError extends Error {
  constructor() {
    super('globalThis.crypto.getRandomValues is not available in this environment');
    this.name = 'SecureRandomUnavailableError';
  }
}

/** `getRandomValues`만 요구하는 최소 crypto 타입. */
interface CryptoLike {
  getRandomValues(array: Uint8Array): Uint8Array;
}

/**
 * `globalThis.crypto`를 호출 시점에 읽어 돌려준다. 쓸 수 없으면 `SecureRandomUnavailableError`를 던진다.
 * 접근이 예외를 던지는 환경(권한 정책이 막은 경우)도 "없음"과 같게 다룬다.
 * 돌려준 객체에서 `getRandomValues`를 메서드로 호출해야 한다.
 * 변수로 꺼내 호출하면 브라우저에서 `Illegal invocation`이 난다.
 */
function getCrypto(): CryptoLike {
  let crypto: Partial<CryptoLike> | undefined;
  try {
    crypto = (globalThis as unknown as Record<string, Partial<CryptoLike> | undefined>).crypto;
  } catch {
    crypto = undefined;
  }
  if (typeof crypto?.getRandomValues !== 'function') {
    throw new SecureRandomUnavailableError();
  }
  return crypto as CryptoLike;
}

const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * `chars`에서 `length`개를 균등하게 뽑아 이어 붙인다.
 * 바이트 하나로 글자 위치를 정하고, `cutoff` 이상의 바이트는 버려 modulo 편향을 없앤다(rejection sampling).
 * 난수원에는 수용 확률의 기댓값으로 정한 바이트 수를 요청하고, 모자라면 남은 글자 수로 다시 요청한다.
 * `@cp949/random`의 `pickChars`와 `randomString`에서 옮겼다.
 */
function pickChars(chars: readonly string[], length: number): string {
  const crypto = getCrypto();
  const size = chars.length;
  const cutoff = 256 - (256 % size);
  let out = '';
  let remaining = length;
  while (remaining > 0) {
    const bytes = new Uint8Array(Math.ceil((remaining * 256) / cutoff));
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]!;
      if (byte < cutoff) {
        out += chars[byte % size]!;
        remaining -= 1;
        // 필요한 글자를 채웠으면 이 요청의 남는 바이트는 버린다.
        if (remaining === 0) break;
      }
    }
  }
  return out;
}

function genId_(prefix: string, length = 6) {
  return prefix + pickChars(BASE36_CHARS, length);
}

const _MIN_LEN = 6;

const FALSE_FN = () => false;

/**
 * `prefix` 뒤에 소문자·숫자 `_MIN_LEN`자의 보안 난수 문자열을 붙인 id를 만든다.
 * `existing(id)`가 `true`이면 접두사에 일련번호를 붙이고 난수 길이를 늘려 가며 다시 만든다.
 * @throws {SecureRandomUnavailableError} `globalThis.crypto.getRandomValues`를 쓸 수 없을 때.
 */
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
