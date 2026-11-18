import type * as proto from '@cp949/xx-kodiny-pet-proto';

/** `KodinyPet`의 상태 */
export type PetState = 'stopped' | 'stopping' | 'started';
/** 실행기의 상태 */
export type CommandRunnerState = 'none' | 'initialized' | 'started' | 'stopped';

/**
 * iframe의 로딩 상태
 * 디버깅용일 뿐 통신에서 사용되지 않는다.
 */
export type PageLoadState = 'loading' | 'loaded' | 'unloaded';

/** 연결을 다루는 처리기의 모양. 이 패키지는 쓰지 않는 선언이다. */
export interface IRequestHandlerProto {
  /** 연결을 시작한다. */
  connect: () => Promise<unknown>;

  /** 연결을 끊는다. */
  disconnect: () => Promise<unknown>;

  /** 현재 연결 상태를 돌려준다. */
  getConnectionState: () => Promise<proto.IframeState>;
}
