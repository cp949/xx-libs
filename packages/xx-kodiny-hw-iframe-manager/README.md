# @cp949/xx-kodiny-hw-iframe-manager

부모 페이지에서 하드웨어 iframe에 명령을 보내고, iframe이 보낸 응답·연결 상태·알림을 받는 라이브러리다. iframe 쪽은 `@cp949/xx-kodiny-hw-iframe`가 맡는다.

## 설치

`rxjs`와 `@cp949/xx-kodiny-hw-iframe`는 peerDependencies다. 직접 설치한다. 후자는 응답·알림 타입을 가져오는 데 쓴다.

```bash
pnpm add @cp949/xx-kodiny-hw-iframe-manager @cp949/xx-kodiny-hw-iframe rxjs
```

## 사용

```ts
import { hwIframeManager } from '@cp949/xx-kodiny-hw-iframe-manager';

// 페이지에 <iframe id="KODINY_HW_IFRAME" src="..."> 가 있어야 한다.
hwIframeManager.observeState().subscribe((state) => console.log(state));
hwIframeManager.observeNotification().subscribe((it) => console.log(it.kind, it.value));

hwIframeManager.start('hw-1');
const state = await hwIframeManager.runCmd('getConnectionState');
hwIframeManager.stop();
```

- `hwIframeManager`: 기본 선택자를 쓰는 공유 인스턴스다.
- `new HwIframeManager(iframeSelector = '#KODINY_HW_IFRAME')`: 선택자를 바꿔 따로 만들 수 있다. `document.querySelector`로 iframe을 찾는다.
- `start(hwId)`: 메시지 수신을 시작한다. iframe은 생성자의 선택자로 찾는다. iframe이 아직 없으면 500ms 간격으로 다시 찾는다.
- `stop()`: 수신을 멈추고 `state`를 `stopped`로 바꾸고 `hwId$`를 비운다. `updateDisconnectedForce()`는 `io.stop()`만 부른다.
- `state`, `isStopped`, `isConnected()`: `started`, `connecting`, `connected`, `disconnected`, `stopped` 중 하나다. iframe이 `kind: 'connectionState'` 알림으로 보낸 값을 따른다.
- `observeState()`, `observeIframeMounted()`, `observeCmdResponse()`, `observeNotification()`: `rxjs` `Observable`을 돌려준다.
- `waitUntilConnected()`: `connected`가 될 때까지 기다린다. 시간 제한이 없다.
- `setLogger(logger)`: 기본은 `console`이다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

### runCmd 반환 규칙

| 상황                                      | 결과                       |
| ----------------------------------------- | -------------------------- |
| 성공 응답                                 | 응답의 `value`             |
| iframe을 3초 안에 찾지 못하거나 요청 실패 | `undefined`                |
| `errorCode`가 있는 실패 응답              | 던지지 않고 `null`         |
| `errorCode`가 빈 문자열인 실패 응답       | `message`로 `Error`를 던짐 |

응답을 기다리는 시간 제한은 없다. 응답을 기다리는 중 `stop()`을 불러도 `runCmd`는 끝나지 않는다.

### 메시지 형식

부모가 iframe에 보내는 명령:

```ts
{ requestId, type: 'cmd', cmd, args }
```

`requestId`는 모듈을 불러온 시각(ms)에서 시작해 요청마다 1씩 늘어나는 숫자다. 응답은 같은 `requestId`로 매칭한다. iframe이 `type: 'notify'`로 보낸 메시지는 `observeNotification()`으로, `type: 'cmd'`는 `observeCmdResponse()`로 전달한다. `success`가 `boolean`이 아니거나 `type`을 모르는 메시지, `source`가 `react-devtools`로 시작하는 메시지는 버린다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- Node에서는 동작하지 않는다. `window`와 `document`를 쓴다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- 메시지의 `origin`과 보낸 창을 검사하지 않는다. 어느 창이 보낸 메시지든 처리한다.
- iframe으로 보낼 때 `targetOrigin`이 `*`다.
- `runCmd`는 응답 대기 시간 제한이 없다.
- `stop()`을 불러도 대기 중인 `runCmd`는 끝나지 않는다.
- `waitUntilConnected()`는 시간 제한이 없다.

## 개발

```bash
pnpm --filter @cp949/xx-kodiny-hw-iframe-manager test
pnpm --filter @cp949/xx-kodiny-hw-iframe-manager build
```

## 라이선스

MIT
