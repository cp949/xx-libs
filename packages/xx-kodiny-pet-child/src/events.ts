/**
 * 실행기와 사용자 코드가 구독하는 이벤트의 이름과 인자 모양.
 */
import type * as proto from '@cp949/xx-kodiny-pet-proto';
import type { IPetCommandRunner, PetState, PageLoadState } from './types';

/** `KodinyPet`이 알리는 상태 이벤트 */
export interface PetNotifyEventMap {
  /** `KodinyPet`의 상태가 바뀜. `stopping`, `started`, `stopped` 순서로 알린다. */
  stateChanged: (state: PetState) => void;

  /** iframe 상태가 바뀜. 이 패키지는 이 이벤트를 내보내지 않는다. */
  iframeStateChanged: (state: proto.IframeState) => void;

  /** 페이지 로딩 상태가 바뀜. `DOMContentLoaded`에서 `loaded`, `beforeunload`에서 `unloaded`를 알린다. */
  pageStateChanged: (state: PageLoadState) => void;

  /** 실행기의 `init()`이 끝남 */
  commandRunnerInitialized: (commandRunner: IPetCommandRunner) => void;

  /** 실행기의 `destroy()`가 끝남 */
  commandRunnerDestroyed: () => void;

  /** 에이전트가 시작을 마침. 이 시점부터 부모의 명령을 실행한다. */
  commandRunnerStarted: (commandRunner: IPetCommandRunner) => void;

  /** 실행기의 `stop()`과 정리가 끝남. `KodinyPet.stop()`이 먼저 리스너를 모두 지워 구독자에게 도착하지 않는다. */
  commandRunnerStopped: () => void;

  /** 실행기 상태가 바뀜. `state`에 따라 `commandRunner`가 있을 수도 없을 수도 있다. */
  commandRunnerStateChanged: (
    params:
      | { state: 'none'; commandRunner: undefined }
      | { state: 'initialized'; commandRunner: IPetCommandRunner }
      | { state: 'started'; commandRunner: IPetCommandRunner }
      | { state: 'stopped'; commandRunner?: IPetCommandRunner },
  ) => void;
}

/** 부모가 보낸 명령을 알리는 이벤트 */
export interface PetCommandEventMap {
  /** 부모에게서 명령 요청을 받음. 반환 타입은 쓰지 않아 `any`로 둔다. */
  command: (request: proto.CmdRequest) => any;
}
