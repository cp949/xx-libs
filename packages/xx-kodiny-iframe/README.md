# @cp949/xx-kodiny-iframe

부모 페이지에서 iframe에 명령을 보내고, iframe이 보낸 응답·상태·알림을 받는 라이브러리다. 메시지 타입은 `@cp949/xx-kodiny-iframe-proto`가 정의한다.

## 설치

`rxjs`와 `@cp949/xx-kodiny-iframe-proto`는 peerDependencies다. 직접 설치한다. 후자는 응답·알림 타입을 가져오는 데 쓴다.

```bash
pnpm add @cp949/xx-kodiny-iframe @cp949/xx-kodiny-iframe-proto rxjs
```

## 사용

```ts
import { KodinyIframe } from '@cp949/xx-kodiny-iframe';

// 페이지에 <iframe id="my-iframe" src="..."> 가 있어야 한다.
const iframe = new KodinyIframe('my-token', '#my-iframe');
iframe.observeState().subscribe((state) => console.log(state));
iframe.observeNotification().subscribe((it) => console.log(it.kind, it.value));

iframe.start();
const value = await iframe.runCmd('getValue', [1]);
iframe.stop();
```

- `new KodinyIframe(iframeToken, iframeSelector)`: 두 인자 모두 필수다. `document.querySelector`로 iframe을 찾는다.
- `start()`: 메시지 수신을 시작하고 상태를 `starting`으로 바꾼다. iframe이 아직 없으면 500ms 간격으로 다시 찾는다. 이미 `starting`이나 `ready`이면 아무것도 하지 않는다.
- `stop()`: 수신을 멈추고 상태를 `stopped`로 바꾼다.
- `state`, `isStopped`, `isStarting`, `isReady`, `isStartingOrReady`: `starting`, `ready`, `stopped` 중 하나다. iframe이 `kind: 'iframe-state'` 알림으로 보낸 값을 따른다.
- `observeState()`, `observeIframeMounted()`, `observeIframeReady()`, `observeCmdResponse()`, `observeNotification()`: `rxjs` `Observable`을 돌려준다.
- `setLogger(logger)`: `debug`, `info`, `warn`을 가진 객체를 받는다. 기본은 `console`이다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

### runCmd 반환 규칙

`runCmd(cmd, args?, requestId?)`의 결과는 아래와 같다.

| 상황                                      | 결과                       |
| ----------------------------------------- | -------------------------- |
| 성공 응답                                 | 응답의 `value`             |
| iframe을 3초 안에 찾지 못하거나 요청 실패 | `undefined`                |
| 응답을 기다리는 중 `stop()` 호출          | `undefined`                |
| `errorCode`가 있는 실패 응답              | 던지지 않고 `null`         |
| `errorCode`가 빈 문자열인 실패 응답       | `message`로 `Error`를 던짐 |

응답을 기다리는 시간 제한은 없다. `stop()`을 부르면 대기가 끝난다.

### 메시지 형식

부모가 iframe에 보내는 명령:

```ts
{ requestId, type: 'cmd', cmd, args }
```

`requestId`를 주지 않으면 모듈을 불러온 시각(ms)에서 시작해 요청마다 1씩 늘어나는 숫자를 쓴다. 응답은 같은 `requestId`로 매칭한다.

iframe이 부모로 보내는 메시지는 `iframeToken`이 생성자에 준 값과 같고 `success`가 `boolean`이어야 처리한다. `type: 'notify'`는 `observeNotification()`으로, `type: 'cmd'`는 `observeCmdResponse()`로 전달한다. `kind: 'iframe-state'`이고 `value`가 있는 알림은 상태 갱신에 쓰고 `observeNotification()`으로는 전달하지 않는다. 토큰이 다르거나 `success`가 `boolean`이 아닌 메시지, `type`을 모르는 메시지, `source`가 `react-devtools`로 시작하는 메시지는 버린다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- Node에서는 동작하지 않는다. `window`와 `document`를 쓴다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- 메시지의 `origin`과 보낸 창을 검사하지 않는다. `iframeToken`이 같으면 어느 창이 보낸 메시지든 처리한다.
- iframe으로 보낼 때 `targetOrigin`이 `*`다.
- `iframe-state` 알림의 `value`를 검사하지 않는다. 세 상태가 아닌 값도 그대로 상태가 된다.
- `data`가 `null`인 메시지를 받으면 핸들러에서 `TypeError`가 난다.
- `runCmd`는 응답 대기 시간 제한이 없다.

## 개발

```bash
pnpm --filter @cp949/xx-kodiny-iframe test
pnpm --filter @cp949/xx-kodiny-iframe build
```

## 라이선스

MIT
