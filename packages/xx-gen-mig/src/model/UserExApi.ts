import { ExApiResponseTypeKey } from './common-types';

/**
 * @interface UserExApi 사용자 외부 API
 */
export interface UserExApi {
  /**
   * 외부 API ID
   */
  apiId: string;

  /**
   * 외부 API 이름
   */
  apiName: string;

  /**
   * 소유 Account ID
   */
  accountId: number;

  /**
   * URL
   * query 문자열 포함, GET 방식만 지원
   */
  url: string;

  /**
   * 응답 타입
   */
  responseType: ExApiResponseTypeKey;

  /**
   * 변경 시간
   */
  changeTimestamp: number;
}
