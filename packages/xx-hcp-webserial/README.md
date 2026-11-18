# @cp949/xx-hcp-webserial

Web Serial API로 시리얼 하드웨어를 열고, 수신 바이트를 패킷으로 나누고, 장치별 제어 객체(Control)로 명령을 보내는 라이브러리다. 연결 상태와 패킷 타입은 `@cp949/xx-hcp-interface`가 정의한다.

## 설치

`@cp949/xx-hcp-interface`와 `rxjs`는 peerDependencies다. 직접 설치한다. 앱 전체가 이 두 모듈을 하나씩만 공유해야 하므로 번들에 넣지 않는다.

```bash
pnpm add @cp949/xx-hcp-webserial @cp949/xx-hcp-interface rxjs
```

`WebSerialDevice`의 시그니처가 `SerialPort`, `SerialOptions` 전역 타입을 쓴다. TypeScript로 타입 검사를 하려면 Web Serial 타입 선언(`@types/w3c-web-serial` 등)이 필요하다.

## 사용

```ts
import { WebSerialDevice, webSerialHardwareMap } from '@cp949/xx-hcp-webserial';

const port = await navigator.serial.requestPort();

const device = new WebSerialDevice();
// SerialOptions는 장치 사양에 맞춰 정한다.
await device.open(port, { baudRate: 9600 });

const control = webSerialHardwareMap.wiseXboard.createControl({ device });
control.observePacket().subscribe((packet) => console.log(packet));
await control.onAfterOpen({});

// 사용을 마치면 Control을 먼저 정리하고 장치를 닫는다.
await control.onBeforeClose({});
await device.close();
```

공개 API는 다음 다섯 가지뿐이다. 각 장치의 Control 클래스는 내보내지 않는다. `createControl`로만 만든다.

- `WebSerialDevice`: 시리얼 포트 하나를 감싸는 장치 객체다.
- `webSerialHardwares`: 지원 장치 목록이다. `IHw` 배열이다.
- `webSerialHardwareMap`: `hwId`로 `IHw`를 찾는 `Record`다.
- `DelimiterParser`: 구분자 바이트열로 수신 데이터를 패킷으로 나눈다.
- `InterByteTimeoutParser`: 마지막 바이트 뒤 일정 시간 조용하면 모인 바이트를 한 패킷으로 낸다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

### 지원 장치

`webSerialHardwares`의 순서와 `hwId`는 다음과 같다. 모두 `hwKind`가 `serial`이다.

1. `wiseXboard`
2. `wiseXboardPremium`
3. `exMarsCube`
4. `saeonAltinoLite`
5. `saeonAl`

`createControl(ctx)`는 `ctx.device`(`WebSerialDevice`)로 Control을 만든다. Control은 `observePacket()`, `onAfterOpen(ctx)`, `onBeforeClose(ctx)`를 가진다. 장치별 명령은 Control마다 다르다.

### WebSerialDevice

- `open(port, options)`: 이미 열려 있으면 먼저 닫고 연다. 상태는 `opening`을 거쳐 `opened`가 된다.
- `close()`: 상태를 `closing`으로 바꾸고 reader를 취소한 뒤 포트를 닫는다. 끝나면 `closed`다. 이미 `closed`이면 아무것도 하지 않는다.
- `write(bytes)`: 포트에 바이트를 쓴다.
- `observeDeviceState()`, `observeOpenedOrNot()`, `isOpened()`: 상태는 `opening`, `opened`, `closing`, `closed` 중 하나다.
- `observeRawData()`: 읽은 바이트를 `{ timestamp, dataBuffer }`로 방출한다. `timestamp`는 읽은 시각(`Date.now()`)이다. `opened`일 때만 방출한다.
- `waitUntilOpened(timeoutMilli = 0)`: `opened`가 되면 `true`로 끝난다. 0이면 시간 제한이 없다. 양수이면 시간이 지날 때 rxjs `TimeoutError`로 reject한다.
- `getRawSerialPort()`: 바인딩된 `SerialPort`를 돌려준다. 닫혔으면 `undefined`다.
- `DEBUG`: `true`로 두면 상세 로그를 `console`에 남긴다.

### 파서

```ts
import { DelimiterParser } from '@cp949/xx-hcp-webserial';
import { map } from 'rxjs';

device
  .observeRawData()
  .pipe(
    map((it) => it.dataBuffer),
    DelimiterParser.parse({ delimiter: new Uint8Array([0x0d, 0x0a]) }),
  )
  .subscribe((packet) => console.log(packet));
```

- `DelimiterParser.parse({ delimiter, includeDelimiter })`: `Uint8Array` 스트림을 구분자 기준 패킷으로 나눈다. `includeDelimiter`가 `true`이면 패킷 끝에 구분자를 포함한다. 기본은 포함하지 않는다. 빈 패킷은 보내지 않는다.
- `InterByteTimeoutParser.parse({ interval, maxBufferSize })`: `interval`ms 동안 새 바이트가 없으면 모인 바이트를 낸다. `maxBufferSize`(기본 65536)바이트에 닿으면 바로 낸다.
- `InterByteTimeoutParser`는 옵션이 잘못되면 생성 시 `TypeError`를 던진다. `interval`은 1 이상 숫자여야 하고, `maxBufferSize`는 1 이상 숫자여야 한다.
- 두 파서의 `new`와 `enqueue`로 직접 쓸 수도 있다. 이때 `chunkCallback`이 패킷을 받는다.

## 지원 환경

- 브라우저: Web Serial API가 필요하므로 Chrome 89 이상에서 동작한다.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- Web Serial API를 쓰지 못하는 환경에서는 포트를 얻을 수 없다. 이 패키지는 포트를 직접 만들지 않는다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

WebSerialDevice와 파서:

- `write()`는 포트가 바인딩되지 않았거나 `writable`이 이미 잠겨 있으면 던지지 않는다. `console.warn`만 남기고 쓰지 않은 채 돌아온다. 잠긴 경우는 100ms 기다린 뒤 돌아온다.
- `open()`은 `port.open()`이 실패해 `readable`이 생기지 않으면 200ms 간격으로 계속 다시 시도한다. 횟수 제한이 없다. `close()`를 부를 때까지 이어진다.
- `DelimiterParser`는 구분자 없이 65536바이트 이상 쌓이면 버퍼를 통째로 버린다.
- `DelimiterParser.parse`와 `InterByteTimeoutParser.parse`는 상류가 `complete`하거나 `error`를 내도 하위로 전달하지 않는다. `subscriber.complete`와 `subscriber.error`를 `bind` 없이 넘겨서 `TypeError`가 rxjs의 unhandled 오류로 보고된다.
- `InterByteTimeoutParser`의 `interval`이 `NaN`이면 `"interval" is not a number`가 아니라 `"interval" is required`를 던진다.
- 읽기 루프가 reader를 시작할 때와 끝날 때 `console.log`를 남긴다. `DEBUG`와 무관하다.

Control 공통과 wiseXboard 계열:

- Control의 읽기(`readNext_`)는 호출한 시각보다 `timestamp`가 큰 패킷만 받는다. 호출 전에 도착한 패킷은 쓰지 않는다.
- `wiseXboardPremium`의 읽기는 체크섬이 틀리거나 패킷이 8바이트보다 짧으면 던지지 않고 0을 돌려준다. 재시도하려는 코드가 있지만 루프가 한 번만 돌아 재시도하지 않는다.
- `wiseXboardPremium`의 `onBeforeClose`는 `device.isOpened`를 호출하지 않고 함수 참조로 검사한다. 항상 참으로 평가되어 장치가 닫혀 있어도 쓰기를 시도한다.
- `wiseXboard`의 `digitalWrite`는 핀 범위를 검사하지 않는다. 0번 핀은 패킷의 명령 바이트를 덮어쓴다.
- `wiseXboard`의 `setDCMotorSpeed`는 한쪽 방향만 제한한다. `l1`, `r1`은 -10 미만만, `l2`, `r2`는 10 초과만 맞춘다. 반대쪽은 제한하지 않는다.
- 두 장치의 `onBeforeClose`는 쓰기 오류를 삼킨다.
- 두 장치의 Control은 `DEBUG`가 `true`로 고정되어 명령마다 `console.log`를 남긴다.

saeonAl과 saeonAltinoLite:

- `saeonAl`의 `go`는 속도가 0이어도 방향 비트 `0x80`이 선다.
- `saeonAl`의 `steering`은 숫자가 아닌 옵션을 거르지 않는다. `Right-abc`는 `NaN`이 되어 프레임 5번과 체크섬이 0으로 실린다.
- `saeonAl`의 체크섬은 마스크 없이 합산해 `Uint8Array`로 바뀔 때 잘린다. `display_off`는 `DMC`를 지우지 않는다.
- 두 장치의 소리 음계 표 `NOTE_SCALE`에 `'F (Fa#)'` 키가 `'F# (Fa#)'`와 같은 값 7로 중복되어 있다.
- `saeonAltinoLite` 파서는 `packetLength`를 대입하기 전에 읽어서 내부 버퍼가 길이 1인 배열로 시작한다. `saeonAl` 파서도 이 파서를 쓴다.
- 두 장치의 모듈 수준 `output`과 `sensors`는 인스턴스 사이에 공유된다.

exMarsCube:

- `Queue`는 초기 상태가 `[[]]`이라 첫 `enqueue` 뒤 `length`가 2다. 송신 타이머가 빈 패킷을 먼저 쓴다.
- `setNonBrake`는 0이나 1이 아닌 값이면 0 7바이트를 보낸다.
- `convertEnumType`은 값이 없으면 `'undefind'`(원본 철자)를 돌려준다.
- `types.ts`의 `Index`와 `PacketType`에 값이 같은 enum 멤버가 있다.
- 나머지 setter, `getDiceNumberRecord`, `setSolveCube`와 `setPlayNote`의 색별 분기, 수신 패킷에 `0x5A` 바이트가 섞일 때의 `dividePacket` 동작은 테스트로 확인하지 않았다.

## 개발

```bash
pnpm --filter @cp949/xx-hcp-webserial test
pnpm --filter @cp949/xx-hcp-webserial build
```

## 라이선스

MIT
