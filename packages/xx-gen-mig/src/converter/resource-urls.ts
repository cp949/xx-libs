/**
 * 레거시 리소스 서버의 URL 설정이다.
 */
export interface LegacyResourceOptions {
  /**
   * 레거시 리소스 서버의 기준 URL이다.
   * 하위 경로 `upload/`, `sound/`가 이 URL 아래에 있어야 한다.
   * 끝의 `/`는 있어도 없어도 된다.
   * 예: `https://example.com/legacy-resources`
   */
  legacyResourceBaseUrl: string;

  /**
   * 변환한 이미지 URL을 한 번 더 바꾸는 함수다. 생략하면 바꾸지 않는다.
   * GEN 파일에 절대 URL로 들어 있는 구 서버 주소를 새 서버 주소로 바꿀 때 쓴다.
   *
   * 호출 조건:
   * - 한 객체에서 여러 번 호출되고, 두 번째부터는 이미 바뀐 URL이 들어온다. 멱등이어야 한다.
   * - 파일명을 뺀 디렉터리 URL도 들어온다.
   * - `data:`로 시작하는 URL은 넘기지 않는다.
   * - 함수가 던진 오류는 `migrateGenFile`의 reject로 올라간다.
   */
  rewriteLegacyUrl?: (url: string) => string;
}

/** 기준 URL에서 만든 URL 접두어와 변환 함수. 접두어는 `/`로 끝난다. */
export interface LegacyResourceUrls {
  upload: string;
  sound: string;
  rewrite: (url: string) => string;
}

/**
 * 옵션을 검증하고 URL 접두어와 변환 함수를 만든다.
 * JS 호출자가 옵션을 빠뜨려도 잘못된 URL이 조용히 만들어지지 않도록 던진다.
 */
export const createLegacyResourceUrls = (
  options: LegacyResourceOptions | undefined,
): LegacyResourceUrls => {
  const baseUrl = options?.legacyResourceBaseUrl;
  if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
    throw new Error('legacyResourceBaseUrl is required');
  }
  const base = baseUrl.trim().replace(/\/+$/, '');
  return {
    upload: `${base}/upload/`,
    sound: `${base}/sound/`,
    rewrite: options?.rewriteLegacyUrl ?? ((url) => url),
  };
};
