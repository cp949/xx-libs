# @cp949/xx-hcp-client-browser

브라우저에서 HCP 서버에 WebSocket으로 연결해 하드웨어 명령을 보내고 알림을 받는 클라이언트다. 패킷 형식과 알림 타입은 `@cp949/xx-hcp-interface`가 정의한다.

## 설치

`@cp949/xx-hcp-interface`와 `rxjs`는 peerDependencies다. 직접 설치한다. 알림은 `@cp949/xx-hcp-interface`의 `HcpNotificationEvent`로 전달한다. 앱 전체가 이 모듈 하나를 공유해야 하므로 번들에 넣지 않는다.

```bash
pnpm add @cp949/xx-hcp-client-browser @cp949/xx-hcp-interface rxjs
```

## 사용

```ts
import { HcpClient } from '@cp949/xx-hcp-client-browser';

const client = new HcpClient('ws://localhost:3000');
client.observeConnectionStatus().subscribe((status) => console.log(status));
client.observeHwNotifications('firmata-value').subscribe((it) => console.log(it));

client.connect();
await client.waitForConnected();

const res = await client.requestHwControl('hw1.setLed', 13, true);
console.log(res.bodyAsJson());

client.close();
```

- `new HcpClient(address)`: `string` 또는 `URL`이다. `WebSocket`에 그대로 넘긴다.
- `connect(cancel$?)`: 연결을 시작한다. `cancel$`가 값을 내보내면 `close()`한다.
- `observeConnectionStatus()`, `isConnected()`, `waitForConnected()`: 상태는 `DISCONNECTED`, `CONNECTING`, `PREPARING`, `CONNECTED` 순서로 바뀐다. `waitForConnected()`에는 시간 제한이 없다.
- `requestHwControl(hwCommand, ...args)`: `hw,control` 패킷을 보내고 같은 `requestId`의 응답 패킷을 돌려준다.
- `requestMetaCmd(cmd, ...args)`: `meta,cmd` 패킷을 보내고 같은 `requestId`의 응답 패킷을 돌려준다.
- `observeHwNotifications(type?)`: `HcpNotificationEvent.observeHwNotification()`을 돌려준다. `type`을 주면 그 `type`만 거른다.
- `close()`: 소켓을 닫고 상태를 `DISCONNECTED`로 돌린다.
- ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

### 연결과 알림

1. `connect()`가 WebSocket을 열면 상태가 `CONNECTING`이 된다.
2. 연결이 열리면 `PREPARING`으로 바꾸고 `meta,hello` 패킷을 보낸다.
3. 서버가 `meta,welcome` 패킷을 보내면 `CONNECTED`가 된다.
4. `proc`이 `notify`인 패킷은 JSON 본문을 `HcpNotificationEvent.send()`로 전달한다.

연결이 끊기면 자동으로 다시 연결하지 않는다. 서버가 끊으면 상태가 `DISCONNECTED`가 되고, 다시 쓰려면 `connect()`를 부른다.

### 요청 규칙

- `hwCommand`는 `'hwId.cmd'` 문자열이다. `{ hwCmd: 'hwId.cmd', args }` 객체도 받는다. `.`으로 나눈 앞의 두 조각만 쓴다.
- 형식이 맞지 않으면 아무것도 보내지 않고 `Error('unknown')`으로 reject한다.
- 응답을 7000ms 안에 받지 못하면 rxjs `TimeoutError`로 reject한다.
- 요청마다 `req`로 시작하는 `requestId`를 새로 만든다. 뒤는 36진수 일련번호이고, 시작 값은 0~9999 중 `globalThis.crypto.getRandomValues`로 뽑는다. 첫 요청 때 한 번 뽑는다.
- `globalThis.crypto.getRandomValues`를 쓸 수 없으면 요청이 `SecureRandomUnavailableError`로 reject된다. `Math.random()`으로 대체하지 않는다.

### 패킷 형식

```text
channel: hw,control
contentType: json
hwId: hw1
requestId: req1a

{"hwId":"hw1","cmd":"setLed","args":[13,true]}
```

- 헤더는 `이름: 값` 줄이고, 빈 줄 뒤가 본문이다.
- `channel`은 `channelId,proc` 형식이다.
- `HcpPacketHelper.parseBuffer()`는 형식이 맞지 않는 패킷에 `null`을 돌려주고 `console.log`로 알린다. 던지지 않는다.

## 지원 환경

- 브라우저: Chrome 75 이상. `WebSocket`, `TextEncoder`, `TextDecoder`, `crypto.getRandomValues`를 쓴다.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- 브라우저용이다. 테스트는 Node에서 직접 만든 가짜 `WebSocket`으로 실행하며, 실제 서버와 연결해 확인하지 않았다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- `requestHwControl`에 객체 `{ hwCmd, args }`를 넘기면 본문 `args`에 객체의 `args`가 아니라 가변 인자(`...args`)가 들어간다. 가변 인자를 주지 않으면 `[]`이다. 객체의 `args`는 사용되지 않는다.
- 헤더 값에 `:`가 있으면 첫 `:` 앞까지만 값으로 읽는다. 예: `url: http://x:80/p`는 `http`가 된다.
- `channel`에 `,`가 둘 이상이면 앞의 두 조각만 쓴다. `hwCommand`의 `.`도 같다.
- `connect()`는 `CONNECTED`일 때만 미리 던진다. 그 전(`CONNECTING`, `PREPARING`)에 다시 부르면 소켓의 `start()`가 던지지만, 구독은 이미 새로 만들어진다. 이 경우 알림이 `HcpNotificationEvent`로 두 번 전달된다.
- `waitForConnected()`는 시간 제한이 없다.
- 소켓이 시작되지 않았거나 닫힌 상태에서 요청하면 패킷은 보내지지 않고 7000ms 뒤 `TimeoutError`가 된다.
- 알림은 `proc`이 `notify`이면 `channel`과 관계없이 전달한다.

## 개발

```bash
pnpm --filter @cp949/xx-hcp-client-browser test
pnpm --filter @cp949/xx-hcp-client-browser build
```

## 라이선스

MIT
