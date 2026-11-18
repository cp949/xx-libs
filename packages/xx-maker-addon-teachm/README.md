# @cp949/xx-maker-addon-teachm

티처블 머신 모델(이미지·자세·소리)을 숨겨진 iframe에서 실행하고, 부모 페이지에서 그 iframe에 명령을 보내는 kodiny 메이커 애드온이다. 모델을 돌리는 페이지는 `iframeUrl`로 따로 서비스해야 한다. 이 패키지에는 포함되지 않는다.

원본 README의 설명:

- tfjs 버전 문제 때문에 모델 실행을 iframe으로 옮겼다.
- 이미지와 자세 분류는 iframe 방식으로 동작한다.
- 소리 분류도 구현돼 있지만 쓰지 않는다. iframe 화면을 터치해야 마이크 권한을 얻을 수 있어 사용자가 불편하기 때문이다.

## 설치

`@cp949/xx-kodiny-iframe`, `@cp949/xx-maker-interface`, `rxjs`는 peerDependencies다. 직접 설치한다. `@cp949/xx-kodiny-iframe`는 `@cp949/xx-kodiny-iframe-proto`를 peerDependencies로 요구한다.

```bash
pnpm add @cp949/xx-maker-addon-teachm @cp949/xx-kodiny-iframe @cp949/xx-kodiny-iframe-proto @cp949/xx-maker-interface rxjs
```

## 사용

```ts
import { TeachmImageAddon } from '@cp949/xx-maker-addon-teachm';

const addon = new TeachmImageAddon({
  teachmImage: { iframeUrl: 'https://example.com/teachm-image/index.html' },
});

const labels = await addon.getClassLabels('https://example.com/model/');
const result = await addon.predict('https://example.com/model/', imageDataUrl);
console.log(result.classLabel, result.score);

addon.onAddonDestroy();
```

애드온은 `@cp949/xx-maker-interface`의 `IMakerAddon`을 구현한다. 생성자는 `IMakerConfig` 중 자기 몫의 키만 읽는다.

| 애드온             | config 키     | 메서드                                                                |
| ------------------ | ------------- | --------------------------------------------------------------------- |
| `TeachmImageAddon` | `teachmImage` | `loadModel`, `hasModel`, `predict`, `getClassLabels`                  |
| `TeachmPoseAddon`  | `teachmPose`  | `loadModel`, `hasModel`, `predict`, `getClassLabels`                  |
| `TeachmAudioAddon` | `teachmAudio` | `loadModel`, `hasModel`, `startListen`, `wordLabels`, `stopListening` |

- 첫 메서드 호출에서 iframe을 만들고 시작한다. 이후 호출은 같은 iframe을 쓴다.
- `predict`, `getClassLabels`, `startListen`, `wordLabels`는 먼저 `loadModel` 명령을 보낸 뒤 자기 명령을 보낸다.
- `iframe` getter는 `Teachm*Iframe` 인스턴스를 돌려준다. 처음 읽을 때 만든다.
- `onAddonInit(args)`는 로그만 남긴다.
- `onAddonDestroy()`는 시작한 경우에만 iframe을 멈추고 인스턴스를 버린다.

### iframe 클래스

`TeachmImageIframe`, `TeachmPoseIframe`, `TeachmAudioIframe`는 `new Teachm*Iframe({ iframeUrl })`로 만든다.

- `start()`: 화면에 보이지 않는 iframe(`width`, `height` 0)을 body에 붙이고 `@cp949/xx-kodiny-iframe`의 `KodinyIframe`으로 메시지 수신을 시작한다.
- `stop()`: 수신을 멈춘다. 같은 클래스의 시작된 인스턴스가 더 없으면 iframe 요소를 지운다.
- `runCmd(cmd, args?)`: iframe이 `ready`가 되기를 기다린 뒤 명령을 보내고 응답의 `value`를 돌려준다. 응답·오류 규칙은 `KodinyIframe.runCmd`를 따른다.

iframe 주소는 `iframeUrl + '?iframeToken=' + 이름`이다. 이름은 클래스마다 고정이다.

| 클래스              | iframe id·name·iframeToken   |
| ------------------- | ---------------------------- |
| `TeachmImageIframe` | `CODINY_IFRAME_TEACHM_IMAGE` |
| `TeachmPoseIframe`  | `CODINY_IFRAME_TEACHM_POSE`  |
| `TeachmAudioIframe` | `CODINY_IFRAME_TEACHM_AUDIO` |

iframe 안의 페이지가 이 토큰으로 응답하므로 이름을 바꾸지 않았다. 소리 분류 iframe에는 `allow="microphone"`이 붙는다.

ESM(`import`)과 CommonJS(`require`)를 모두 지원한다.

## 지원 환경

- 브라우저: Chrome 75 이상.
- 번들: 문법은 ES2019 수준이다. `pnpm check:escompat`가 빌드 결과와 Chrome 75에 없는 API 이름을 검사한다.
- Node에서는 동작하지 않는다. `window`와 `document`를 쓴다.

## 알려진 한계

원본에서 옮긴 동작이다. 바꾸지 않고 테스트로 고정했다.

- iframe을 같은 클래스의 인스턴스끼리 공유하고 정적 참조 수로 센다. `start()`를 두 번 부르고 `stop()`을 한 번 부르면 iframe이 남는다.
- `start()`하지 않은 인스턴스의 `stop()`도 참조 수를 줄인다. 다른 인스턴스가 쓰는 iframe이 지워질 수 있다.
- `start()` 전에 `runCmd`를 부르면 `iframe not created` 경고를 남기고 `undefined`를 돌려준다. 이때도 iframe 요소는 만든다.
- `loadModel`은 응답 값을 버린다. `errorCode`가 있는 실패 응답은 `runCmd`가 `null`로 돌려주는데 이 값도 버려서, 호출자는 모델 로딩 실패를 알 수 없다.
- `predict`와 `getClassLabels`는 부를 때마다 `loadModel` 명령을 다시 보낸다.
- `stopListening`은 시작하기 전이면 아무것도 보내지 않고 `undefined`를 돌려준다.
- iframe이 `ready`가 되지 않으면 `runCmd`는 끝나지 않는다. 시간 제한이 없다.
- 메시지의 `origin`과 보낸 창을 검사하지 않고, 보낼 때 `targetOrigin`이 `*`다. `KodinyIframe`에서 이어받은 동작이다.

## 개발

```bash
pnpm --filter @cp949/xx-maker-addon-teachm test
pnpm --filter @cp949/xx-maker-addon-teachm build
```

## 라이선스

MIT
