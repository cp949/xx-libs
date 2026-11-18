# @cp949/xx-kodiny-pet-child

iframe 안에서 부모 페이지가 보낸 kodiny pet 명령을 실행하고, 결과와 이벤트를 부모에게 돌려주는 라이브러리입니다. 부모 쪽은 `@cp949/xx-kodiny-pet-parent`가 맡습니다.

## 설치

peerDependencies는 없습니다. 프로토콜 타입 패키지 `@cp949/xx-kodiny-pet-proto`는 dependencies라서 자동으로 설치됩니다.

```bash
pnpm add @cp949/xx-kodiny-pet-child
```

## 사용

```ts
import { KodinyPet, type IPetContext } from '@cp949/xx-kodiny-pet-child';

// 부모가 보낸 cmd와 같은 이름의 멤버 함수가 명령으로 호출된다.
class PetRunner {
  constructor(private readonly context: IPetContext) {}

  async init() {}
  async start() {}
  async stop() {}
  async destroy() {}

  async play(name: string) {
    this.context.toParent.event.emit('played', name);
    return 'ok';
  }
}

// 토큰은 부모 쪽 IframeController의 iframeToken과 같아야 한다.
const pet = new KodinyPet({ iframeToken: 'token-1', commandRunnerClass: PetRunner });
await pet.start();
```

- `new KodinyPet({ iframeToken, commandRunnerClass })`: `commandRunnerClass`는 `IPetContext`를 받는 생성자이고, `init`, `start`, `stop`, `destroy`를 가져야 합니다.
- `start()`: 실행기를 만들어 `init()`하고 부모에게 `__iframe-state` 이벤트로 `starting`, `ready`를 알립니다. 이어서 부모 명령 수신을 시작합니다.
- `stop()`: 에이전트를 멈추고 수신을 닫습니다. `notifyEvents`, `commandEvents`, `uiEvents`의 리스너를 모두 지웁니다.
- 페이지가 `beforeunload`되면 `stop()`을 호출합니다.
- `toParent.cmd.success()`, `toParent.cmd.error()`, `toParent.event.emit()`: 부모에게 프레임을 보냅니다. 모든 프레임에 `iframeToken`이 붙습니다.
- `notifyEvents`: `stateChanged`(`stopping`, `started`, `stopped`), `pageStateChanged`, `commandRunner*` 이벤트를 알립니다. 이름과 인자는 `PetNotifyEventMap`에 있습니다.
- `proto`: `@cp949/xx-kodiny-pet-proto`의 타입 네임스페이스를 다시 내보냅니다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원합니다.

### 명령 실행 규칙

- 에이전트가 `ready`일 때만 명령을 실행합니다.
- 명령 함수가 값을 돌려주면 `{ type: 'cmd', success: true, requestId, value }`를 보냅니다.
- 명령 함수가 던지면 `{ type: 'cmd', success: false, requestId, errorCode: 'unknown', message }`를 보냅니다.
- `cmd`와 같은 이름의 멤버가 함수가 아니면 경고만 남기고 응답하지 않습니다.

## 알려진 제한 (원본 동작)

원본 라이브러리와 같은 동작입니다. 일부는 테스트로 고정되어 있습니다.

- 부모가 보낸 메시지의 `event.origin`, `event.source`, `iframeToken`을 검사하지 않습니다. `type`과 `cmd`가 문자열이면 명령으로 받습니다.
- 부모로 보내는 메시지의 대상 origin은 `*`입니다.
- 명령 이름에 허용 목록이 없습니다. 부모는 실행기의 `init`, `stop`, `destroy` 같은 멤버도 명령으로 호출할 수 있습니다.
- `stop()` 뒤에 실행기의 `destroy()`가 호출되지 않고 부모로 `__iframe-state stopped`도 가지 않습니다. 정리 체인이 실행기를 비운 뒤에 `destroy`를 찾기 때문입니다.
- `stop()`은 실행기 정리를 기다리지 않고 리스너를 모두 지웁니다. `commandRunnerStopped`와 `commandRunnerStateChanged`(`stopped`)는 구독자에게 도착하지 않습니다. 모든 메서드가 바로 끝나는 실행기로 확인했습니다.
- `start()`에서 에이전트 시작이 실패해도 로그만 남기고 `stateChanged`로 `started`를 알립니다.
- `PetAgent`는 실행기의 `start()`를 호출하지 않습니다.

## 지원 환경

- 대상은 Chrome 75입니다. 빌드가 문법(`??`, `?.` 등)을 ES2019 수준으로 낮춥니다.
- API polyfill은 넣지 않습니다. Chrome 75에 없는 API는 `scripts/check-banned-api.mjs`로 소스에서 막습니다.
- 브라우저 DOM(`window`)이 필요합니다. 서버에서 불러오는 것은 지원하지 않습니다.
- 검증은 정적 검사(`es-check es2019`, `check-banned-api`, 타입 검사)와 jsdom 테스트까지입니다. 실제 Chrome 75에서 실행해 검증하지 않았습니다.
- `check-banned-api`는 이름 검색이라 `obj[name]()` 같은 동적 접근은 잡지 못하고, 정규식 리터럴 안의 따옴표는 구분하지 않습니다.
- `src/eventemitter`는 `eventemitter3`에서 옮긴 코드입니다. 라이선스는 `LICENSE-eventemitter3`에 있습니다.

## 개발

```bash
pnpm install
pnpm build            # dist/ 생성 (ESM, CJS, d.ts)
pnpm test             # vitest (jsdom)
pnpm check-types      # tsc
pnpm check:escompat   # dist 문법 검사와 금지 API 검사
pnpm check:package    # exports 경로로 ESM·CJS 로드 확인
```

## 라이선스

MIT
