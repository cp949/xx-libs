# @cp949/xx-kodiny-pet-proto

kodiny pet iframe 통신 프로토콜의 메시지 타입 정의입니다. 타입 선언만 있고 런타임 코드는 없습니다.

## 설치

```bash
pnpm add @cp949/xx-kodiny-pet-proto
```

## 사용

```ts
import type { CmdRequest, Frame } from '@cp949/xx-kodiny-pet-proto';

const request: CmdRequest = { type: 'cmd', requestId: 1, cmd: 'play', args: ['idle'] };

function handleFrame(frame: Frame) {
  if (frame.type === 'event') {
    console.log(frame.eventKey, frame.args);
    return;
  }
  if (frame.success) {
    console.log(frame.requestId, frame.value);
  } else {
    console.error(frame.errorCode, frame.message);
  }
}
```

- `CmdRequest`: iframe에 보내는 명령 요청.
- `Frame`: iframe이 보내는 프레임. `type`이 `cmd`이면 `success`로, `event`이면 `eventKey`로 다룹니다.
- `CmdFrame`, `CmdSuccessFrame`, `CmdErrorFrame`, `EventFrame`: `Frame`의 구성 타입.
- `CmdSuccessPayload`, `CmdErrorPayload`, `EventPayload`: 프레임의 본문 타입.
- `RequestId`, `IframeState`: 요청 식별자와 iframe 상태(`stopped`, `starting`, `ready`).
- ESM(`import`)과 CommonJS(`require`)를 모두 지원합니다.

## 알려진 제한

- `CmdSuccessPayload.value`는 `any`입니다. 명령마다 반환 타입이 달라 호출하는 쪽에서 좁혀야 합니다.

## 지원 환경

- 대상은 Chrome 75입니다. 빌드가 문법을 ES2019 수준으로 낮춥니다.
- 런타임 코드가 없어 polyfill과 금지 API 검사는 두지 않습니다.
- 검증은 정적 검사(`es-check es2019`, 타입 검사)까지입니다. 실제 Chrome 75에서 실행해 검증하지 않았습니다.

## 개발

```bash
pnpm install
pnpm build            # dist/ 생성 (ESM, CJS, d.ts)
pnpm test             # vitest
pnpm check-types      # tsc
pnpm check:escompat   # dist 문법 검사
pnpm check:package    # exports 경로로 ESM·CJS 로드 확인
```

## 라이선스

MIT
