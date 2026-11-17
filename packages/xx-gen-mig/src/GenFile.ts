import { MakerSound } from './model/common-types';
import { ObjectImage } from './model/ObjectImage';
import { UserDataset } from './model/UserDataset';
import { UserExApi } from './model/UserExApi';

export declare const USER_VAR_PREFIX = 'aimk-user-var-';

/**
 * 사용자 정의 리스트
 */
export declare type UserDefinedList = {
  listId: string;
  listName: string;
  values: string[];
};

export declare type UserVariable = {
  varId: string;
  varName: string;
  defaultValue?: string;
};

export declare type ObjectSignal = {
  signalId: string;
  signalName: string;
};

export interface GenFileScene {
  /**
   * 장면 ID
   */
  sceneId: string;

  /**
   * 장면 이름
   */
  sceneName: string;

  /**
   * 블록 XML
   */
  blockXml: string;

  /**
   * 오브젝트 및 배경 목록
   */
  objects: ObjectImage[];

  /**
   * 사운드 리소드
   */
  sounds: MakerSound[];
}

export interface GenFile {
  /**
   * GenFile 버전번호, 정수
   */
  _version: number; // ex) 1, 2, 3, ...

  /**
   * four character code: GenFile 타입
   * fourcc = aimk
   */
  _fourcc: string;

  projectName: string;

  /**
   * GenFile 만든 사람
   */
  author?: string;

  /**
   * 생성일시 : 초 단위(소수점은 밀리)
   */
  createTimestamp: number;

  /**
   * 장면 목록
   */
  scenes: GenFileScene[];

  /**
   * 사용자 정의 리스트 목록
   */
  userdefinedlists: UserDefinedList[];

  /**
   * 사용자 정의 변수 목록
   */
  sharedVariables: UserVariable[];

  /**
   * 사용자 데이터 세트 목록
   */
  userDatasets: UserDataset[];

  /**
   * 사용자 외부 API 목록
   */
  userExApis: UserExApi[];

  /**
   * 사용자 신호 목록
   */
  signals: ObjectSignal[];

  /**
   * GenFile의 썸네일
   * 썸네일 이미지의 데이터 URL
   */
  thumbnailUrl: string;
}
