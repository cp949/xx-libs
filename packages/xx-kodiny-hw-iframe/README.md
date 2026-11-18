# @cp949/xx-kodiny-hw-iframe

하드웨어를 다루는 iframe 안쪽에서 부모 페이지와 `postMessage`로 통신하는 라이브러리다. 부모가 보낸 명령을 받아 iframe의 핸들러 함수를 호출하고, 결과와 연결 상태 알림을 부모에 돌려보낸다. 부모 쪽은 `@cp949/xx-kodiny-hw-iframe-manager`가 맡는다. 두 패키지가 주고받는 메시지 타입은 이 패키지가 정의한다.

## 설치

```bash
pnpm add @cp949/xx-kodiny-hw-iframe
```

## 사용

```ts
import { AbstractParentSender, IframeCommandAgent } from '@cp949/xx-kodiny-hw-iframe';
import type { ConnectionState, IRequestHandlerProto } from '@cp949/xx-kodiny-hw-iframe';

// 부모가 cmd 이름으로 호출할 함수를 가진 객체다.
class MyHandler implements IRequestHandlerProto {
  async connect() {}
  async disconnect() {}
  async getConnectionState(): Promise<ConnectionState> {
    return 'connected';
  }
}

const sender = new AbstractParentSender();
const agent = IframeCommandAgent.setup(new MyHandler(), sender);

// 메시지 수신은 직접 연결한다. agent가 listener를 등록하지 않는다.
window.addEventListener('message', agent.handleMessageEvent);

sender.notifyConnectionState('connected');
```

- `IframeCommandAgent`: 부모가 보낸 `{ type: 'cmd', requestId, cmd, args }`를 받아 핸들러의 `cmd` 함수를 `args`로 호출한다. 결과는 `success` 응답으로, 던진 오류는 `errorCode: 'unknown'`의 `error` 응답으로 보낸다.
- `AbstractParentSender`: `window.parent.postMessage(payload, '*')`로 보내는 구현이다. `success`, `error`, `notify`와 편의 함수 `notifyLoadingState('loaded' | 'unloaded')`, `notifyConnectionState(state)`를 제공한다.
- `notify`로 보내는 알림은 `{ success: true, type: 'notify', kind, value }` 형태다. 부모 매니저는 `kind: 'connectionState'` 알림으로 연결 상태를 갱신한다.
- 타입: `CmdRequest`, `SuccessResponsePayload`, `ErrorResponsePayload`, `NotificationPayload`, `ConnectionState`, `RequestId`, `IRequestHandlerProto`, `IParentSender`.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- Node에서는 동작하지 않는다. `window`를 쓴다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- 메시지의 `origin`을 검사하지 않는다. 어느 창이 보낸 메시지든 처리한다.
- 부모로 보낼 때 `targetOrigin`이 `*`다.
- cmd 이름의 허용 목록이 없다. 핸들러 객체의 함수 속성이면 상속받은 함수(예: `toString`)도 호출된다.
- 핸들러에 없는 cmd나 `type`이 문자열이 아닌 메시지는 응답 없이 버린다. 부모는 응답을 받지 못한다.
- 메시지를 받을 때마다 `console.log`로 출력한다.

## 개발

```bash
pnpm --filter @cp949/xx-kodiny-hw-iframe test
pnpm --filter @cp949/xx-kodiny-hw-iframe build
```

## 라이선스

MIT
