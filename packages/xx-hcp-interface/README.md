# @cp949/xx-hcp-interface

HCP 하드웨어 제어 계층이 함께 쓰는 타입, 알림 이벤트, 연결 환경 필터를 담은 라이브러리다. `@cp949/xx-hcp-client-browser`, `@cp949/xx-hcp-emul-firmata`, `@cp949/xx-hcp-webserial`이 이 패키지를 peerDependencies로 쓴다.

## 설치

`rxjs`는 peerDependencies다. 직접 설치한다.

```bash
pnpm add @cp949/xx-hcp-interface rxjs
```

HCP 패키지를 함께 쓰면 이 패키지는 한 벌만 설치되어야 한다. `HcpNotificationEvent`가 모듈 안의 `Subject` 하나를 공유하기 때문이다.

## 사용

### 알림 이벤트

```ts
import { HcpNotificationEvent } from '@cp949/xx-hcp-interface';

// 전체 알림
HcpNotificationEvent.observe().subscribe((it) => console.log(it.type));

// type이 'firmata-value'인 하드웨어 알림만
HcpNotificationEvent.observeHwNotification().subscribe((it) => {
  console.log(it.kind, it.periId, it.eventName, it.value);
});

HcpNotificationEvent.send({ type: 'firmata-value' });
```

- 구독하기 전에 보낸 알림은 받지 못한다.
- `observeHwNotification()`은 `type`이 `firmata-value`인 알림만 통과시킨다.

### 연결 환경 필터

```ts
import { createHwFilterFn, type Hardware, type IHwConnEnv } from '@cp949/xx-hcp-interface';

const env: IHwConnEnv = {
  isChromeOS: false,
  isCodingpack: false,
  isMobile: false,
  isAndroid: false,
  isIOS: false,
  isDesktop: true,
  isWindows: true,
  isMacOs: false,
};
const supported = (hardwares: Hardware[]) => hardwares.filter(createHwFilterFn(env));
```

`createHwEnvFilterFn(env)`는 환경 플래그를 아래 순서로 한 가지만 골라 `Hardware`의 지원 필드를 검사한다. 앞 조건이 참이면 뒤 조건은 보지 않는다.

| 환경 플래그    | 검사하는 필드       |
| -------------- | ------------------- |
| `isCodingpack` | `supportKodinypack` |
| `isChromeOS`   | `supportChromeOS`   |
| `isAndroid`    | `supportAndroid`    |
| `isIOS`        | `supportIOS`        |
| 그 밖          | `supportDesktop`    |

`createHwFilterFn(env, filterFn?)`는 환경 필터와 `filterFn`을 모두 통과해야 참이다.

### 상수

- `HwConnMode`: 연결 모드 키(`net`, `webSerial`, `iframe`)와 표시 이름이다.
- `DEFAULT_SERIAL_OPTIONS`: `baudRate`를 뺀 기본 시리얼 옵션이다. `dataBits` 8, `stopBits` 1, `parity` `none`, `flowControl` `none`, `bufferSize` 255.

### 타입

런타임 값이 없는 타입 선언이다. `IDevice`, `IHwControl`, `IHw`, `IHwEmul`, `IHcpPacket`, `IHcpNotification`, `IHcpHwNotification`, `Hardware`, `HardwareIframeInfo`, `HardwareSerialOptions`, `HwDeviceState`, `BufferTimestamped`, `HwTransportProto`, `HwConnModeKey`, `IHwConnEnv`를 내보낸다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

## 개발

```bash
pnpm --filter @cp949/xx-hcp-interface test
pnpm --filter @cp949/xx-hcp-interface build
```

## 라이선스

MIT
