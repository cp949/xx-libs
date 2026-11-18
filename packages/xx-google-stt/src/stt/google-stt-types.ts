/**
 * STT 세션 실행 상태
 * 세션 실행 상태는 실제 연결상태를 의미하지 않는다.
 * 세션이 실행중이더라도, 웹소켓 연결은 실패할 수도 있다.
 */
export type GoogleSttSessionState = 'running' | 'stopped';

/**
 * STT 웹소켓 상태
 */
export type GoogleSttSocketState = 'FIRST' | 'CONNECTED' | 'DISCONNECTED';

export type GoogleSttEncodingType =
  | 'ENCODING_UNSPECIFIED'
  | 'LINEAR16'
  | 'FLAC'
  | 'MULAW'
  | 'AMR'
  | 'AMR_WB'
  | 'OGG_OPUS'
  | 'SPEEX_WITH_HEADER_BYTE'
  | 'WEBM_OPUS';

/**
 * STT 옵션
 */
export interface GoogleSttOptions {
  languageCode?: string; // default ko-KR
  sampleRateHertz?: number; // default 16000
  encoding?: GoogleSttEncodingType; // default LINEAR16
  enableWordTimeOffsets?: boolean;
  profanityFilter?: boolean;
  singleUtterance?: boolean;
  interimResults?: boolean;
}

/**
 * STT 인식 상태
 * recognize-started : 음성인식이 시작된 상태, 마이크 녹음을 시작한다. 이 상태는 반드시 수신한다.
 * recognizing: 음성인식중인 상태, 마이크 녹음을 계속 진행.
 * recognize-finishing: 음성인식 종료 중 상태, 마이크 녹음을 중지한다. 이 상태는 수신하지 못할 수 있다.
 * recognize-finished: 음성인식을 마친 상태, 마이크 녹음을 중지한다. 이 상태는 반드시 수신한다.
 */
export type GoogleSttRecognizeState =
  | 'none'
  | 'recognize-started'
  | 'recognizing'
  | 'recognize-finishing'
  | 'recognize-finished';

/**
 * STT 음성 인식 상태 및 결과
 * state = recognize-finished 일때, transcript에 음성인식이 완료된 문자열이 설정된다
 * state = recognizing 일때, transcript에 음성인식중인 문자열이 설정된다
 */
export interface GoogleSttRecognition {
  state: GoogleSttRecognizeState;
  transcript?: string;
}
