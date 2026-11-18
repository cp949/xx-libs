# @cp949/xx-kodiny-iframe-proto

부모 페이지와 iframe이 `postMessage`로 주고받는 메시지의 타입 정의다. 타입 선언만 있고 런타임 코드는 없다. `@cp949/xx-kodiny-iframe`가 이 타입을 쓴다.

## 설치

```bash
pnpm add @cp949/xx-kodiny-iframe-proto
```

## 사용

```ts
import type { CmdRequest, ResponsePayload } from '@cp949/xx-kodiny-iframe-proto';

const request: CmdRequest = { type: 'cmd', requestId: 1, cmd: 'getValue', args: [1] };

function handle(payload: ResponsePayload) {
  if (payload.type === 'notify') {
    console.log(payload.kind, payload.value);
  } else if (payload.success) {
    console.log(payload.requestId, payload.value);
  } else {
    console.error(payload.errorCode, payload.message);
  }
}
```

- `CmdRequest`: iframe에 보내는 명령 요청.
- `ResponsePayload`: iframe이 보내는 메시지. `type`이 `notify`이면 `NotificationPayload`, `cmd`이면 `success`로 `SuccessResponsePayload`와 `ErrorResponsePayload`를 구분한다.
- `CmdResponsePayload`: `ResponsePayload`에서 알림을 뺀 것.
- `RequestId`, `IframeState`: 요청 식별자(문자열 또는 숫자)와 iframe 상태(`starting`, `ready`, `stopped`).
- `ISendToParent`: iframe 쪽에서 부모에게 응답과 알림을 보내는 객체의 형태.
- 모든 응답에는 `iframeToken` 문자열이 들어 있다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

## 알려진 제한

- `SuccessResponsePayload.value`와 `NotificationPayload.value`는 `any`다. 명령과 알림마다 값이 달라 호출하는 쪽에서 좁혀야 한다.

## 지원 환경

- 대상은 Chrome 75다. 빌드가 문법을 ES2019 수준으로 낮춘다.
- 런타임 코드가 없어 polyfill과 금지 API 검사는 두지 않는다.
- 검증은 정적 검사(`es-check es2019`, 타입 검사)까지다. 실제 Chrome 75에서 실행해 검증하지 않았다.

## 개발

```bash
pnpm --filter @cp949/xx-kodiny-iframe-proto build
pnpm --filter @cp949/xx-kodiny-iframe-proto check-types
```

## 라이선스

MIT
