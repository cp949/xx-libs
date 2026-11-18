# @cp949/xx-maker-interface

kodiny 메이커의 애드온·설정 타입과 id 생성, 스테이지 좌표 변환 유틸을 모은 라이브러리다. 애드온 패키지(`@cp949/xx-maker-addon-teachm` 등)와 메이커 본체가 공통으로 쓴다.

## 설치

```bash
pnpm add @cp949/xx-maker-interface
```

## 사용

```ts
import {
  genId,
  toUserX,
  toUserY,
  fromUserX,
  fromUserY,
  OBJECT_STAGE_SIZE,
  type IMakerAddon,
  type IMakerAddonConfig,
  type IMakerConfig,
} from '@cp949/xx-maker-interface';

const id = genId('obj_'); // 예: 'obj_4fzzzx'

const existingIds = new Set<string>(['obj_4fzzzx']);
const uniqueId = genId('obj_', (candidate) => existingIds.has(candidate));

toUserX(0); // -279
toUserY(0); // 167.5
fromUserX(0); // 279
```

### genId(prefix, existing?)

- `prefix` 뒤에 `Math.random()`의 base36 문자열 6자를 붙여 돌려준다.
- `existing(id)`가 `true`를 돌려주면 접두사에 일련번호를 붙여 다시 만든다. 두 번째 시도부터 난수 길이를 6, 7, 8, … 15자로 늘린다.
- 첫 시도를 포함해 11번 모두 충돌하면 `Error('genIdAuto() fail')`을 던진다.
- 일련번호는 모듈 안의 전역 값이다. 1부터 시작해 20,000,000 다음에는 1로 돌아간다.

### 좌표 변환

스테이지 크기는 `OBJECT_STAGE_WIDTH`(558), `OBJECT_STAGE_HEIGHT`(335), `OBJECT_STAGE_SIZE`로 노출한다.

- `toUserX(x)`, `toUserY(y)`: 스테이지 좌표를 사용자 좌표로 바꾼다. 원점은 스테이지 중앙이고 Y축은 위로 향한다. 값이 `undefined`이면 0으로 본다.
- `fromUserX(cx)`, `fromUserY(cy)`: 사용자 좌표를 스테이지 좌표로 되돌린다.
- 결과는 소수 첫째 자리까지 반올림한다.

### 타입

- `IMakerConfig`: 애드온이 받는 설정이다. `teachmPose`, `teachmImage`, `teachmAudio`는 `{ iframeUrl }`을, `tts`는 `{ url, aiToken? }`을 가진다.
- `IMakerAddon`: `onAddonInit?(args?)`, `onAddonDestroy?()` 훅을 가진다. 둘 다 선택이다.
- `IMakerAddonConfig`: `addonId`, `propertyName?`, `addon`(`new (config: IMakerConfig) => IMakerAddon`)을 가진다.

ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- 런타임 코드는 DOM에 접근하지 않는다. Node에서도 불러올 수 있다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- `genId`의 난수 길이가 `Math.random()`의 base36 문자열보다 길면 id가 더 길어지지 않는다. 테스트에서 쓴 값(`0.123456789`)은 11자였고, 이 값에서는 난수 길이 11~15자의 다섯 시도가 같은 id가 된다.
- `Math.random()`이 짧은 소수 표현을 돌려주면 id가 6자보다 짧아진다. 값이 `0.5`이면 `prefix + 'i'`, `0`이면 `prefix`만 나온다.
- 좌표 변환 결과가 반올림으로 0이 되는 음수이면 `0`이 아니라 `-0`이다. 예: `toUserX(278.96)`.
- `IMakerConfig`가 `tts` 설정을 요구한다. TTS 애드온 패키지는 이 저장소로 옮기지 않았지만 타입에는 남아 있다.

## 개발

```bash
pnpm --filter @cp949/xx-maker-interface test
pnpm --filter @cp949/xx-maker-interface build
```

## 라이선스

MIT
