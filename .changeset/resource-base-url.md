---
'@cp949/xx-gen-mig': major
---

`migrateGenFile`이 두 번째 인자로 `{ legacyResourceBaseUrl }`을 필수로 받는다. 이미지·소리 URL에 하드코딩했던 리소스 서버 주소를 호출자가 정한다.
구 서버 URL 치환 규칙도 내장하지 않고, 호출자가 `rewriteLegacyUrl` 함수 옵션으로 제공한다.

`xml2js`와 `lodash.get` peerDependency를 없앴다. XML 파싱·생성은 패키지 안의 코드가 하고, `sax`와 `xmlbuilder`를 dependencies로 쓴다. 설치할 때 `xml2js`와 `lodash.get`을 함께 설치하지 않아도 된다.
