# @cp949/xx-google-stt

브라우저에서 마이크 음성을 socket.io 서버로 보내고, 서버가 Google 음성 인식(STT)으로 얻은 결과를 받는 클라이언트 라이브러리다. Google API를 직접 부르지 않는다. 이 라이브러리와 맞는 socket.io 서버가 따로 있어야 한다.

## 설치

`rxjs`와 `socket.io-client`는 peerDependencies다. 직접 설치한다.

```bash
pnpm add @cp949/xx-google-stt rxjs socket.io-client
```

## 사용

```ts
import { Subject } from 'rxjs';
import { GoogleSttSession } from '@cp949/xx-google-stt';

// 이 Subject가 발행되면 세션이 진행 중인 구독과 소켓 대기를 모두 끝낸다.
const stop$ = new Subject<void>();

const session = new GoogleSttSession('https://stt.example.com', '/stt/socket.io', stop$, 10000);

session.observeRecognition().subscribe(({ state, transcript }) => {
  console.log(state, transcript);
});

const media = await navigator.mediaDevices.getUserMedia({ audio: true });
session.open(media, { languageCode: 'ko-KR', interimResults: true });

// 인식이 끝나면 세션이 스스로 닫는다. 직접 닫을 때는 close()를 부른다.
session.close();
```

생성자 입력:

- `socketIoUrl`: socket.io 서버 주소.
- `socketIoPath`: socket.io 경로. 주소에 `localhost`가 들어 있으면 이 값을 무시하고 `/socket.io`를 쓴다.
- `stopTrigger`: 발행되면 세션의 구독을 끝내는 `Observable`.
- `sttTimeout`: 인식이 시작되기를 기다리는 시간(ms). 아래 "알려진 한계"를 본다.

세션 메서드:

- `open(media, options)`: 소켓에 연결해 `stt:start`를 보내고 마이크 샘플링 준비를 한다. 음성은 서버가 `stt:recognize-started`를 보낸 뒤부터 보낸다.
- `close()`: 구독을 끊고 소켓을 닫는다. `observeState()`는 `stopped`가 된다.
- `observeState()`: `running` 또는 `stopped`. 연결 상태와는 별개다. `running`이어도 소켓 연결은 실패할 수 있다.
- `observeRecognition()`: `{ state, transcript? }`. `state`는 `none`, `recognize-started`, `recognizing`, `recognize-finishing`, `recognize-finished` 중 하나다.
- `observeConnectedOrNot()`: 소켓 연결 여부(`boolean`).

세션은 다음 경우에 스스로 `close()`한다.

- 서버가 `stt:recognize-finished`를 보낸다.
- 연결됐던 소켓이 끊긴다.

연결된 적 없는 소켓이 끊긴 경우에는 닫지 않는다.

`GoogleSttSocket`은 세션이 쓰는 소켓 계층이다. 세션 없이 서버 이벤트와 전송만 쓸 때 직접 만들 수 있다.

### 옵션

`GoogleSttOptions`는 `stt:start`로 서버에 그대로 전달한다. 이 라이브러리는 값을 검사하거나 기본값을 채우지 않는다. 타입 주석에 적힌 기본값은 서버 구현을 가정한 표기이고, 실제 기본값은 서버가 정한다.

| 필드                    | 타입                    | 주석의 기본값 |
| ----------------------- | ----------------------- | ------------- |
| `languageCode`          | `string`                | `ko-KR`       |
| `sampleRateHertz`       | `number`                | `16000`       |
| `encoding`              | `GoogleSttEncodingType` | `LINEAR16`    |
| `enableWordTimeOffsets` | `boolean`               | 없음          |
| `profanityFilter`       | `boolean`               | 없음          |
| `singleUtterance`       | `boolean`               | 없음          |
| `interimResults`        | `boolean`               | 없음          |

### 서버 프로토콜

클라이언트가 보내는 이벤트:

- `stt:start`: 인자는 `GoogleSttOptions`.
- `stt:speaking`: 인자는 16kHz 모노 PCM(`Uint8Array`). 소켓이 연결돼 있을 때만 보낸다.

서버가 보내야 하는 이벤트:

- `stt:recognize-started`: 인자 없음.
- `stt:recognizing`: 인자는 중간 결과 문자열.
- `stt:recognize-finishing`: 인자 없음. 직전 중간 결과가 있어야 경고가 나지 않는다.
- `stt:recognize-finished`: 인자는 최종 결과 문자열.

## 지원 환경

- 브라우저: Chrome 75 이상. 마이크 입력에 `ScriptProcessorNode`를 쓴다.
- 번들: ESM과 CommonJS. 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- Node에서는 동작하지 않는다. `window`와 `AudioContext`를 쓴다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- `sttTimeout`이 지나도록 인식이 시작되지 않으면 `TimeoutError`가 처리되지 않은 오류로 보고된다. 세션이 오류를 잡지 않아 브라우저에서는 전역 오류가 된다.
- `observeError()`는 값을 발행하지 않는다. 내부에서 오류 값을 채우는 코드가 없다.
- `close()`한 세션은 다시 `open()`해도 음성을 보내지 않는다. 새 `GoogleSttSession`을 만든다.
- 입력 샘플레이트가 16000Hz면 샘플 3개 중 1개만 쓰고 `0xffff`를 곱해 Int16으로 바꾼다. 값이 Int16 범위를 넘으면 잘리지 않고 감겨 소리가 깨질 수 있다. 입력이 48000Hz처럼 더 높을 때는 구간 평균으로 줄이는 다른 경로를 쓴다.
- 샘플레이트는 16000Hz로 고정이다. `GoogleSttOptions.sampleRateHertz`를 바꿔도 녹음 쪽은 바뀌지 않는다.
- `ScriptProcessorNode`는 표준에서 폐기 예정이다. 이 라이브러리는 `AudioWorklet`으로 옮기지 않았다.
- 소켓 재연결을 쓰지 않는다(`reconnection: false`). 끊기면 세션이 닫힌다.
- 서버 `error` 이벤트는 받기만 하고 처리하지 않는다.

## 개발

```bash
pnpm --filter @cp949/xx-google-stt test
pnpm --filter @cp949/xx-google-stt build
```

## 라이선스

MIT
