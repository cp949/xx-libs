/**
 * 던져진 값에서 사람이 읽는 메시지를 꺼낸다.
 *
 * 반환 규칙:
 * - `undefined`나 `null`이면 `unknown`을 돌려준다.
 * - 문자열이면 그대로 돌려준다.
 * - `message`가 문자열이면 그 값을 돌려준다.
 * - 그 밖에는 `String(err)`를 돌려준다.
 *
 * `catch`로 잡은 값은 모양을 알 수 없어 `any`로 받는다.
 */
export function errmsg(err: any): string {
  if (typeof err === 'undefined' || err === null) return 'unknown';
  if (typeof err === 'string') return err;
  if (typeof err['message'] === 'string') {
    return err['message'];
  }
  return String(err);
}
