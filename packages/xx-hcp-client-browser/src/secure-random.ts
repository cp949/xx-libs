/**
 * `globalThis.crypto.getRandomValues`를 쓸 수 없는 환경에서 던지는 오류.
 * 다른 난수원으로 대체하지 않는다. 패키지 밖으로 export하지 않는다.
 * `@cp949/random`의 같은 이름 클래스에서 옮겼다.
 */
class SecureRandomUnavailableError extends Error {
  constructor() {
    super('globalThis.crypto.getRandomValues is not available in this environment');
    this.name = 'SecureRandomUnavailableError';
  }
}

/** `getRandomValues`만 요구하는 최소 crypto 타입. */
interface CryptoLike {
  getRandomValues(array: Uint32Array): Uint32Array;
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

/** 2^32. `getRandomValues`로 얻는 word(부호 없는 32비트)가 가질 수 있는 값의 개수다. */
const TWO_POW_32 = 4_294_967_296;

/**
 * `[0, n)`에서 보안 난수로 균등하게 정수를 뽑는다. `n`은 `1 <= n <= 2^32`인 정수이며 검증은 호출자가 한다.
 * word 하나를 뽑아 `limit = 2^32 - (2^32 % n)` 미만이면 `word % n`을 돌려주고, 아니면 다시 뽑는다(rejection sampling).
 * `limit`이 `n`의 배수라 modulo 편향이 없다. 한 번에 수용될 확률은 50% 이상이다.
 * `@cp949/random`의 `uniformInt`(n <= 2^32 경로)와 `defaultRandomBytes`에서 옮겼다.
 */
export function randomIntBelow(n: number): number {
  const crypto = getCrypto();
  const limit = TWO_POW_32 - (TWO_POW_32 % n);
  const word = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(word);
    if (word[0]! < limit) return word[0]! % n;
  }
}
