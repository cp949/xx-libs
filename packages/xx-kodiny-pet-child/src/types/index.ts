import type * as proto from '@cp949/xx-kodiny-pet-proto';
import type { EventEmitter } from '../eventemitter';
import type { PetCommandEventMap, PetNotifyEventMap } from '../events';
import type { ISendToParent } from './send-to-parent';

export * from './base';
export * as send2parent from './send-to-parent';

/** 실행기 클래스의 생성자 모양. `IPetContext`를 받아 `IPetCommandRunner`를 만든다. */
export type PetCommandRunnerClassType = new (pet: IPetContext) => IPetCommandRunner;

/** 실행기 수명과 명령 실행을 맡는 객체 */
export interface IPetAgent {
  /** 실행기를 만들고 초기화한 뒤 시작한다. */
  start: (commandRunnerClass: PetCommandRunnerClassType) => Promise<void>;

  /** 실행기를 멈추고 정리한다. */
  stop: () => Promise<void>;

  /** 부모가 보낸 명령을 실행한다. 반환 타입은 쓰지 않아 `any`로 둔다. */
  run: (cmdRequest: proto.CmdRequest) => any;
}

/** `KodinyPet` 생성 설정 */
export interface IPetConfig {
  /** 부모의 `IframeController`와 맞춘 토큰. 보내는 모든 프레임에 붙는다. */
  iframeToken: string;

  /** 부모의 명령을 실행할 실행기 클래스 */
  commandRunnerClass: PetCommandRunnerClassType;
}

/** iframe 안의 pet이 노출하는 기능 */
export interface IPet {
  /** 부모 페이지로 보내는 통로 */
  readonly toParent: ISendToParent;

  /** pet을 시작한다. */
  start: () => Promise<void>;

  /** pet을 멈춘다. */
  stop: () => Promise<void>;
}

/** 실행기 생성자가 받는 공용 도구 모음 */
export interface IPetContext {
  /** 부모 페이지로 보내는 통로 */
  toParent: ISendToParent;

  /** 부모가 보낸 명령 이벤트 */
  commandEvents: EventEmitter<PetCommandEventMap>;

  /** pet과 실행기의 상태 이벤트 */
  notifyEvents: EventEmitter<PetNotifyEventMap>;

  /** 실행기와 사용자 코드가 주고받는 이벤트. 이 패키지는 내보내거나 구독하지 않는다. */
  uiEvents: EventEmitter;
}

/**
 * 부모의 명령을 실행하는 객체.
 * 부모가 보낸 `cmd`와 같은 이름의 멤버 함수가 명령으로 호출된다.
 */
export interface IPetCommandRunner {
  /** 만든 직후 `PetAgent`가 호출한다. 끝나면 `PetAgent`가 부모에게 `ready`를 알린다. */
  init: () => Promise<void>;

  /** 동작을 시작한다. `PetAgent`는 이 함수를 호출하지 않는다. */
  start: () => Promise<void>;

  /** 동작을 멈춘다. `PetAgent.stop`이 부른다. */
  stop: () => Promise<void>;

  /** 자원을 정리한다. `PetAgent.stop`이 `stop()` 다음에 부른다. */
  destroy: () => Promise<void>;
}
