# @cp949/xx-hcp-emul-firmata

`IHwEmul`을 감싸 Firmata 주변장치(LED, 버튼, 센서 등)를 만들고, 함수를 부르고, 값 알림을 받는 라이브러리다. 실제 하드웨어와의 통신은 감싸는 `IHwEmul`이 맡는다. 이 패키지는 주변장치 등록 상태 관리, 명령 라우팅, Firmata 알림 필터링, plot 다이얼로그 요청 이벤트를 더한다.

## 설치

`@cp949/xx-hcp-interface`와 `rxjs`는 peerDependencies다. 직접 설치한다. 전자는 `IHwEmul`, `IHcpHwNotification` 타입을 가져오는 데 쓴다.

```bash
pnpm add @cp949/xx-hcp-emul-firmata @cp949/xx-hcp-interface rxjs
```

## 사용

```ts
import type { IHwEmul } from '@cp949/xx-hcp-interface';
import { FirmataHcpEmul, FirmataManager } from '@cp949/xx-hcp-emul-firmata';

declare const baseEmul: IHwEmul; // 실제 하드웨어와 통신하는 IHwEmul 구현
declare const ctx: unknown; // 루틴 컨텍스트. 그대로 baseEmul에 전달된다.

const emul = new FirmataHcpEmul(baseEmul, new FirmataManager());

// 주변장치를 만든다. 같은 periId를 다시 요청하면 명령을 보내지 않는다.
await emul.createPeripheral(ctx, 'led:13', 'Led', { pin: 13 });

// 함수를 부르고 필드 값을 읽는다. 해당 periId가 만들어지기 전이면 만들어질 때까지 기다린다.
await emul.callPeripheral(ctx, 'led:13', false, 'on');
const value = await emul.fieldValuePeripheral(ctx, 'led:13', 'value');

// 값 알림을 받는다. 구독하면 observe 명령을 보낸 뒤 알림을 받는다.
emul
  .observeHwNotifications(ctx, 'firmata-value', 'button:3', 100, 'onChange')
  .subscribe((it) => console.log(it.kind, it.value));
```

- `FirmataHcpEmul(emul, firmataManager)`: `IHwEmul`을 구현한다. `connect`, `waitUntilConnected`, `isConnected`, `onEmulStart`, `onEmulStop`, `onEmulDestroyed`는 감싼 `emul`에 그대로 위임한다.
- `createPeripheral(ctx, periId, ctor, options?)`: `firmata`의 `createPeripheral` 명령을 보내고, 응답이 오면 `periId`를 `active`로 등록한다.
- `callPeripheral(ctx, periId, returnValue, functionName, ...args)`: 주변장치 함수를 부른다.
- `fieldValuePeripheral(ctx, periId, fieldName)`: 주변장치 필드 값을 읽는다.
- `getLastPeriValue(ctx, periId, eventName?, valueKey?)`: 등록을 기다린 뒤 감싼 `emul`에 위임한다.
- `ensureHwNotifications(ctx, periId, eventName, interval?)`: `periId`가 `active`가 되면 `observe` 명령을 한 번 보내고 끝난다.
- `observeHwNotifications(ctx, type, periId, intervalMs, eventName?)`, `observeHwNotificationsDistinct(ctx, type, periId, eventName, value?)`: `periId`가 `active`가 되면 `observe` 명령을 보낸 뒤 감싼 `emul`의 알림 스트림을 구독한다. `type`이 `firmata-value`이고 `kind`가 있는 알림만 내보낸다.
- `observePeriRegistered(periId)`: 등록 상태를 내보낸다. 등록 전에는 아무것도 내보내지 않는다.
- `runCmd(ctx, hwId, cmd, ...args)`: `callPeripheral`, `createPeripheral`, `fieldValuePeripheral` 명령은 위 메서드로 보낸다. 나머지 명령은 감싼 `emul.runCmd`에 그대로 넘긴다.
- `plot(ctx, periId, eventName, interval?)`: `ensureHwNotifications`를 시작하고, plot 다이얼로그가 닫힐 때까지 기다린다.
- `FirmataManager.plot(ctx, periId, eventName)`: `FirmataPlotDialogEvent`로 다이얼로그 열기를 요청하고 닫힐 때까지 기다린다. 요청 중 오류는 삼키고 정상 종료한다.
- `FirmataPlotDialogEvent`: 화면 쪽이 다이얼로그를 열고 닫는 데 쓰는 정적 이벤트 모음이다.
  - `observeOpenRequest()`: 열기 요청(`requestId`, `periId`, `eventName`)을 받는다.
  - `onCloseDialog(requestId)`: 다이얼로그가 닫혔음을 알린다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

### plot 다이얼로그 연결

화면은 `observeOpenRequest()`를 구독해 다이얼로그를 열고, 사용자가 닫으면 받은 `requestId`로 `onCloseDialog`를 부른다.

```ts
import { FirmataPlotDialogEvent } from '@cp949/xx-hcp-emul-firmata';

FirmataPlotDialogEvent.observeOpenRequest().subscribe(async (req) => {
  await openPlotDialog(req.periId, req.eventName); // 화면 쪽 구현
  FirmataPlotDialogEvent.onCloseDialog(req.requestId);
});
```

`observeOpenRequest()`의 구독자 안에서 `onCloseDialog`를 동기로 부르면 `plot`이 끝나지 않는다. "알려진 한계"를 참고한다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- 소스는 `window`와 `document`를 쓰지 않는다. 테스트는 vitest의 node 환경에서 실행한다.
- `FirmataPlotDialogEvent.open`의 `requestId`를 만들 때 `globalThis.crypto.getRandomValues`를 쓴다. 쓸 수 없으면 `open`이 `SecureRandomUnavailableError`를 던진다. `FirmataManager.plot`은 이 오류도 다른 요청 오류처럼 삼키고 정상 종료한다. `Math.random()`으로 대체하지 않는다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- `createPeripheral`을 부르기 전에는 `periId`의 등록 상태가 없다. 내부 `PeripheralRegistry.add`(`pending` 등록)는 어디서도 호출되지 않는다. `createPeripheral`은 응답을 받은 뒤 `active`만 등록한다.
- 같은 `periId`의 `createPeripheral` 응답을 기다리는 동안 다시 요청하면 명령이 두 번 나간다. 중복 방지는 등록이 끝난 뒤부터 동작한다.
- `createPeripheral`이 실패하면 등록하지 않고 오류를 그대로 던진다. 다시 부르면 명령을 다시 보낸다.
- `callPeripheral`, `fieldValuePeripheral`, `getLastPeriValue`, `ensureHwNotifications`는 해당 `periId`가 만들어질 때까지 시간 제한 없이 기다린다. 만들어지지 않으면 끝나지 않는다.
- `plot`은 `ensureHwNotifications`를 기다리지 않는다. 그래서 `observe` 명령의 성공과 실패는 `plot`의 결과에 반영되지 않는다.
- `FirmataManager.plot`은 열기 요청을 내보낸 뒤에 닫힘 응답을 구독한다. `observeOpenRequest()` 구독자가 같은 호출 안에서 `onCloseDialog`를 부르면 응답을 놓쳐 `plot`이 끝나지 않는다.
- `FirmataPlotDialogEvent`의 요청·응답 스트림은 모듈 전역이다. 같은 모듈 인스턴스를 쓰는 모든 `FirmataManager`가 공유한다.
- `runCmd`는 `hwId`가 `firmata`가 아니어도 경고만 남기고 처리한다. 라우팅되는 세 명령은 `hwId`와 관계없이 `firmata`로 다시 보낸다.
- `observeHwNotifications`, `observeHwNotificationsDistinct`는 `kind`가 없는 `firmata-value` 알림을 경고 로그와 함께 버린다. `type`이 다른 알림은 조용히 버린다.
- 로그는 `console`로 직접 출력한다. 로거를 바꾸는 API가 없다.

## 개발

```bash
pnpm --filter @cp949/xx-hcp-emul-firmata test
pnpm --filter @cp949/xx-hcp-emul-firmata build
```

## 라이선스

MIT
