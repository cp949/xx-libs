export interface IMakerConfig {
  teachmPose: {
    iframeUrl: string;
  };
  teachmImage: {
    iframeUrl: string;
  };

  teachmAudio: {
    iframeUrl: string;
  };
  tts: {
    url: string;

    /**
     * AI 토큰은 TTS 요청시 함께 전달할 데이터
     * 실행시점에 값이 없는 경우 프로그램 중지
     */
    aiToken?: string;
  };
}
