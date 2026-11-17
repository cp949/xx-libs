# @cp949/xx-gen-mig

2021년 9월 이전의 GEN 파일(레거시 JSON 객체)을 `GenFile` 객체 포맷으로 변환하는 라이브러리입니다.

## 설치

peerDependencies는 없습니다. `sax`와 `xmlbuilder`는 dependencies라서 자동으로 설치됩니다.

```bash
pnpm add @cp949/xx-gen-mig
```

## 사용

```ts
import { migrateGenFile } from '@cp949/xx-gen-mig';

const genFile = await migrateGenFile(legacyGenObject, {
  legacyResourceBaseUrl: 'https://example.com/legacy-resources',
});
```

- 입력 1: 파싱한 레거시 GEN 객체(`sceneList`, `varList`, `signalList`, `listList` 등을 가진 객체)
- 입력 2: `legacyResourceBaseUrl`(필수). 이미지와 소리 URL을 만들 때 쓰는 레거시 리소스 서버의 기준 URL이다. 끝의 `/`는 있어도 없어도 된다. 없거나 빈 문자열이면 `legacyResourceBaseUrl is required` 오류를 던진다.
- 출력: `Promise<GenFile>` (`_version: 2`, `_fourcc: 'aimk'`)
- ESM(`import`)과 CommonJS(`require`)를 모두 지원합니다.

### 리소스 URL 규칙

기준 URL 아래에 다음 하위 경로가 있어야 합니다.

| 하위 경로 | 대상 URL                                     |
| --------- | -------------------------------------------- |
| `upload/` | `../../uploads/`, `uploads/`로 시작하는 경로 |
| `sound/`  | 소리 파일. `sound/<소리 id>.mp3`             |

GEN 파일에 구 서버의 절대 URL이 들어 있으면 `rewriteLegacyUrl`로 바꿉니다. 옵션을 생략하면 절대 URL은 바꾸지 않습니다.

```ts
await migrateGenFile(legacyGenObject, {
  legacyResourceBaseUrl: 'https://example.com/legacy-resources',
  rewriteLegacyUrl: (url) =>
    url.replace('https://old.example.com/uploads/', 'https://example.com/legacy-resources/upload/'),
});
```

`rewriteLegacyUrl`의 호출 조건:

- 한 객체에서 여러 번 호출됩니다. 두 번째부터는 이미 바뀐 URL이 들어오므로 멱등이어야 합니다.
- 파일명을 뺀 디렉터리 URL도 들어옵니다.
- `data:` URL은 넘기지 않습니다.
- 함수가 던진 오류는 `migrateGenFile`의 reject로 올라갑니다.

## 지원 환경

- 대상은 Chrome 75입니다. 빌드가 문법(`??`, `?.` 등)을 ES2019 수준으로 낮춥니다.
- API polyfill은 넣지 않습니다. Chrome 75에 없는 API는 `scripts/check-banned-api.mjs`로 소스에서 막습니다.
- 타입 검사(`lib: ES2019`)는 보조 수단입니다. 테스트와 스크립트 때문에 `@types/node`가 설치되어 있어 `Array.prototype.at`, `structuredClone`, Node 전역(`process`, `Buffer`, `setImmediate`)을 타입 검사가 막지 못합니다. 그래서 `check-banned-api`가 이 이름들을 직접 검사합니다.
- `check-banned-api`는 이름 검색이라 `obj[name]()` 같은 동적 접근은 잡지 못하고, 정규식 리터럴 안의 따옴표는 구분하지 않습니다.
- 검증은 정적 검사(`es-check es2019`, `check-banned-api`, 타입 검사)까지입니다. 실제 Chrome 75에서 실행해 검증하지 않았습니다.
- XML 파싱·생성은 `src/xml`이 합니다. `xml2js`에서 이 패키지가 쓰는 부분만 옮긴 코드이고, 라이선스는 `LICENSE-xml2js`에 있습니다. 이 코드는 Node 내장 모듈을 쓰지 않습니다.
- 의존성 `sax`는 `stream` 모듈을 `require`합니다. Vite나 webpack 5 같은 번들러에서 브라우저용으로 번들할 때 polyfill 설정이 필요할 수 있습니다. 번들 동작은 확인하지 않았습니다.

## 알려진 제한 (원본 동작)

원본 `gen-mig`와 같은 동작이며 테스트로 고정되어 있습니다. 아래 입력은 `migrateGenFile`이 오류를 던집니다.

- 블록이 없는 장면 XML (`<xml></xml>`)
- `objects` 필드가 없는 `jsonData`
- `object_src`와 `src`가 모두 없는 객체 (`invalid url`)
- `mecha_` 접두사 블록은 XML에서 제거되지 않고, 알 수 없는 블록 경고만 내지 않습니다.

## 개발

```bash
pnpm install
pnpm build            # dist/ 생성 (ESM, CJS, d.ts)
pnpm test             # vitest
pnpm check-types      # tsc
pnpm check:escompat   # dist 문법 검사와 금지 API 검사
pnpm check:package    # exports 경로로 ESM·CJS 로드 확인
```

## 라이선스

MIT
