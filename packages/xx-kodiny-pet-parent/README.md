# @cp949/xx-kodiny-pet-parent

부모 페이지에서 iframe 안의 kodiny pet을 제어하는 라이브러리입니다. iframe에 `postMessage`로 명령을 보내고, iframe이 보낸 응답과 이벤트를 받습니다. iframe 쪽은 `@cp949/xx-kodiny-pet-child`가 맡습니다.

## 설치

`rxjs`는 peerDependencies입니다. 직접 설치해야 합니다. 프로토콜 타입 패키지 `@cp949/xx-kodiny-pet-proto`는 dependencies라서 자동으로 설치됩니다.

```bash
pnpm add @cp949/xx-kodiny-pet-parent rxjs
```

## 사용

```ts
import { IframeController } from '@cp949/xx-kodiny-pet-parent';

// 토큰은 iframe 쪽 KodinyPet의 iframeToken과 같아야 한다.
const pet = new IframeController('token-1', '#pet-frame');

pet.events.on('played', (name) => console.log('iframe 이벤트', name));
pet.observeState().subscribe((state) => console.log(state));

pet.start();
const result = await pet.runCmd('play', ['idle']);
pet.stop();
```

- 생성자 입력 1: `iframeToken`. 같은 토큰을 가진 프레임만 처리합니다.
- 생성자 입력 2: `iframeSelector`. `document.querySelector`로 iframe을 찾는 선택자입니다.
- `start()`: 메시지 수신을 시작합니다. iframe이 아직 없으면 500ms 간격으로 다시 찾습니다.
- `stop()`: 수신을 멈추고 `state`를 `stopped`로 바꿉니다.
- `state`: `stopped`, `starting`, `ready` 중 하나입니다. iframe이 `__iframe-state` 이벤트로 알린 값을 따릅니다.
- `observeState()`, `observeIframeMounted()`, `observeIframeReady()`, `observeCmdResponse()`: `rxjs` `Observable`을 돌려줍니다.
- `events`: iframe이 보낸 이벤트를 `eventKey`로 구독하는 emitter입니다. 이름과 인자 타입은 `any`입니다.
- `proto`: `@cp949/xx-kodiny-pet-proto`의 타입 네임스페이스를 다시 내보냅니다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원합니다.

### runCmd 반환 규칙

| 상황                                      | 결과                       |
| ----------------------------------------- | -------------------------- |
| 성공 응답                                 | 응답의 `value`             |
| iframe을 3초 안에 찾지 못하거나 요청 실패 | `undefined`                |
| 응답을 기다리다 `stop()` 호출             | `undefined`                |
| `errorCode`가 있는 실패 응답              | 던지지 않고 `null`         |
| `errorCode`가 빈 문자열인 실패 응답       | `message`로 `Error`를 던짐 |

응답을 기다리는 시간 제한은 없습니다. 응답이 오지 않으면 `stop()`을 호출할 때까지 기다립니다.

### 메시지 형식

부모가 iframe에 보내는 명령:

```ts
{ requestId, type: 'cmd', cmd, args }
```

iframe이 부모에 보내는 프레임:

```ts
{ iframeToken, type: 'event', eventKey, args }
{ iframeToken, type: 'cmd', success: true, requestId, value }
{ iframeToken, type: 'cmd', success: false, requestId, errorCode, message }
```

`eventKey`가 `__iframe-state`이고 첫 인자가 문자열인 이벤트는 `state`를 바꾸는 예약 이벤트입니다. `events`로 전달하지 않습니다.

## 알려진 제한 (원본 동작)

원본 라이브러리와 같은 동작입니다. 일부는 테스트로 고정되어 있습니다.

- 메시지의 `event.origin`과 `event.source`를 검사하지 않습니다. `iframeToken` 문자열 일치만 확인합니다. 토큰은 비밀이 아닙니다.
- iframe으로 보내는 메시지의 대상 origin은 `*`입니다.
- 실패 응답에 `errorCode`가 있으면 `runCmd`는 오류를 던지지 않고 `null`을 돌려줍니다. 성공한 `null` 값과 구분되지 않습니다.
- `runCmd`는 응답을 기다리는 시간 제한이 없습니다.

## 지원 환경

- 대상은 Chrome 75입니다. 빌드가 문법(`??`, `?.`, private 필드 등)을 ES2019 수준으로 낮춥니다.
- API polyfill은 넣지 않습니다. Chrome 75에 없는 API는 `scripts/check-banned-api.mjs`로 소스에서 막습니다.
- `rxjs`는 번들에 넣지 않습니다. `rxjs`가 Chrome 75에서 도는지는 확인하지 않았습니다.
- 브라우저 DOM(`window`, `document`)이 필요합니다. 서버에서 불러오는 것은 지원하지 않습니다.
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
