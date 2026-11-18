# release

`packages/*`의 공개 패키지를 npm에 배포하는 절차다. 자동화는 `.github/workflows/release.yml`이 맡는다.

## 배포 흐름

1. 패키지 동작을 바꾸는 작업에서 `pnpm changeset`을 실행해 `.changeset/*.md`를 만든다.
2. 작업을 `dev`에서 `main`으로 병합하고 push한다.
3. `release.yml`이 `pnpm verify`를 실행한다.
4. 처리할 changeset이 있으면 `changesets/action`이 "패키지 버전 갱신" PR을 만들거나 갱신한다.
   - PR은 `package.json`의 `version`과 `CHANGELOG.md`를 고치고 소비한 changeset 파일을 지운다.
5. 그 PR을 `main`에 병합한다.
6. 병합 push에서 `release.yml`이 다시 실행된다.
   - 남은 changeset이 없으므로 `pnpm changeset publish`가 npm에 없는 버전의 패키지만 배포한다.
   - 배포한 패키지마다 `<패키지명>@<버전>` 태그와 GitHub Release가 만들어진다.

changeset이 없는 push는 배포하지 않는다. 의도하지 않은 배포를 막는 장치다.

## changeset 작성 기준

- 대상: 배포 산출물이나 사용자가 보는 동작이 바뀌는 변경.
- 제외: 테스트, 문서, 내부 도구만 바뀌는 변경.
- 버전 종류는 패키지별로 고른다.
  - `major`: 호환성이 깨지는 변경.
  - `minor`: 기능 추가.
  - `patch`: 버그 수정.
- 내용은 사용자가 알아야 할 API 변경과 동작 변경을 쓴다.
- 패키지 의존을 가진 패키지는 `updateInternalDependencies` 설정에 따라 의존 버전이 같이 갱신된다.

## 새 패키지 추가 때 할 일

1. `packages/<이름>`에 두고 `package.json`을 맞춘다.
   - `name`은 `@cp949/` 스코프를 쓴다.
   - `repository.directory`는 `packages/<이름>`으로 쓴다.
   - `publishConfig.access`는 `public`으로 쓴다.
   - `build`, `test`, `check-types`, `check:escompat`, `check:package` 스크립트를 `pnpm verify`가 부르는 이름으로 둔다.
2. 패키지 사이 의존은 `workspace:*`로 쓴다. 배포할 때 실제 버전으로 치환된다.
3. npm에 패키지가 없으면 첫 버전은 로컬에서 직접 배포한다.
   - trusted publisher 등록은 npm에 존재하는 패키지에 대해 한다고 가정한다. 이 가정은 확인하지 않았다.
4. npmjs.com의 패키지 설정 "Trusted Publisher"에 GitHub Actions를 등록한다.
   - Organization or user: `cp949`
   - Repository: `xx-libs`
   - Workflow filename: `release.yml`
5. 등록을 마친 뒤 changeset을 만들어 배포 흐름을 따른다.

## 저장소 설정

- GitHub 저장소 Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests"를 켠다. 꺼져 있으면 버전 갱신 PR 생성이 실패한다.
- `main`에 보호 규칙을 두면 `github-actions`가 버전 갱신 브랜치를 push할 수 있어야 한다. 버전 갱신 브랜치는 `main`이 아니라 `changeset-release/main`이다.

## 인증

- npm 토큰을 저장소 비밀값에 두지 않는다.
- 워크플로의 `id-token: write` 권한으로 얻은 OIDC 토큰이 인증을 대신한다.
- trusted publishing은 이 Node에 번들된 npm CLI가 지원해야 한다. `actions/setup-node`에 `registry-url`을 지정하지 않는다. 지정하면 만들어지는 `.npmrc`가 OIDC 인증을 가린다.

## 실패했을 때

- `pnpm verify` 실패: 배포 단계에 가지 않는다. 원인을 고쳐 다시 push한다.
- 배포 단계 인증 실패: 해당 패키지의 trusted publisher 등록 값(저장소, 워크플로 파일명)을 확인한다.
- 일부 패키지만 배포되고 중간에 실패: 같은 `main` 커밋으로 워크플로를 다시 실행한다. `changeset publish`는 npm에 이미 있는 버전을 건너뛴다.

## 확인하지 않은 사항

- 워크플로를 GitHub에서 실행한 적이 없다.
- `changeset publish`가 이 저장소의 pnpm 설정에서 OIDC 인증으로 배포되는지 확인하지 않았다.
- 첫 배포 결과로 위 절차를 확정한다.
