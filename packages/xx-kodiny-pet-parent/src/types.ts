/**
 * 로그 출력 대상의 최소 모양.
 */
/** `console`이 그대로 들어갈 수 있는 로그 출력 대상 */
export interface IConsole {
  /** 디버그 로그 출력 */
  debug: Console['debug'];

  /** 정보 로그 출력 */
  info: Console['info'];

  /** 경고 로그 출력 */
  warn: Console['warn'];
}
