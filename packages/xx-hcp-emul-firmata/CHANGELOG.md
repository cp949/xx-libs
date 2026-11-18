# @cp949/xx-hcp-emul-firmata

## 1.0.1

### Patch Changes

- requestId 생성의 난수원을 `Math.random()`에서 `globalThis.crypto.getRandomValues`로 바꾼다. `globalThis.crypto.getRandomValues`를 쓸 수 없는 환경에서는 `SecureRandomUnavailableError`로 실패하고 `Math.random()`으로 대체하지 않는다. `xx-hcp-client-browser`는 일련번호 시작 값을 모듈을 불러올 때가 아니라 첫 요청 때 뽑는다.
