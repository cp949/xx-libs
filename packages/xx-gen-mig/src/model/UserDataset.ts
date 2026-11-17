/**
 * @interface UserDataset 사용자 데이터셋
 */
export interface UserDataset {
  /**
   * 데이터셋 ID
   */
  datasetId: string;
  /**
   * 데이터셋 이름
   */
  datasetName: string;
  /**
   * 소유 Account ID
   */
  accountId: number;
  /**
   * 데이터셋의 내용
   * key/value 형태
   */
  substance: Record<string, string>;
  /**
   * 변경시간
   */
  changeTimestamp: number;
}
