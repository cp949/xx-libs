# release

`packages/*`의 공개 패키지를 npm에 배포하는 절차다. 자동화는 `.github/workflows/release.yml`이 맡는다.

## 배포 흐름

버전을 올리는 일은 사람이 로컬에서 하고, 워크플로는 배포만 한다. 버전 갱신 PR은 만들지 않는다.

1. 패키지 동작을 바꾸는 작업에서 `pnpm changeset`을 실행해 `.changeset/*.md`를 만든다.
2. 배포할 준비가 되면 `pnpm changeset version`을 실행한다.
   - `package.json`의 `version`과 `CHANGELOG.md`를 고치고 소비한 changeset 파일을 지운다.
   - 결과를 같은 작업에 커밋한다.
3. 작업을 `dev`에서 `main`으로 병합하고 push한다.
4. `release.yml`이 다음을 실행한다.
   - 처리하지 않은 changeset이 남아 있으면 실패한다. 2번을 빠뜨린 경우다.
   - `pnpm verify`를 실행한다.
   - `pnpm changeset publish`가 npm에 없는 버전의 패키지만 배포한다.
   - 배포한 패키지마다 `<패키지명>@<버전>` 태그를 push한다.

버전을 올리지 않은 push는 배포하지 않는다. `publish`가 npm에 이미 있는 버전을 건너뛰기 때문이다.

## changeset 작성 기준

- 대상: 배포 산출물이나 사용자가 보는 동작이 바뀌는 변경.
- 제외: 테스트, 문서, 내부 도구만 바뀌는 변경.
- 버전 종류는 패키지별로 고른다.
  - `major`: 호환성이 깨지는 변경.
  - `minor`: 기능 추가.
  - `patch`: 버그 수정.
- 내용은 사용자가 알아야 할 API 변경과 동작 변경을 쓴다.
- 패키지 의존을 가진 패키지는 `pnpm changeset version`이 `updateInternalDependencies` 설정에 따라 의존 버전을 같이 갱신한다.

## 새 패키지 추가 때 할 일

1. `packages/<이름>`에 두고 `package.json`을 맞춘다.
   - `name`은 `@cp949/` 스코프를 쓴다.
   - `repository.directory`는 `packages/<이름>`으로 쓴다.
   - `publishConfig.access`는 `public`으로 쓴다.
   - `build`, `test`, `check-types`, `check:escompat`, `check:package` 스크립트를 `pnpm verify`가 부르는 이름으로 둔다.
2. 패키지 사이 의존은 `workspace:*`로 쓴다. 배포할 때 실제 버전으로 치환된다.
3. npm에 패키지가 없으면 첫 버전은 로컬에서 직접 배포한다.
   - trusted publisher 등록은 npm에 존재하는 패키지에 대해 한다고 가정한다. 이 가정은 확인하지 않았다.
   - 배포 전에 `pnpm verify`가 통과하고 `npm view <패키지명>`이 404인지 확인한다.
   - `workspace:*` 의존이 있으면 의존 대상을 먼저 배포한다. 예: `xx-kodiny-pet-proto`를 `xx-kodiny-pet-parent`와 `xx-kodiny-pet-child`보다 먼저 배포한다.
   - 루트에서 `./release.sh <패키지 폴더 이름> [옵션]`을 실행한다. 2FA를 쓰면 `--otp=<코드>`를 붙인다. 폴더 이름 뒤의 옵션은 `pnpm publish`에 그대로 넘어간다.
     - 예: `./release.sh xx-kodiny-pet-proto`, `./release.sh xx-kodiny-pet-parent --otp=123456`
     - 실제 배포 없이 확인하려면 `--dry-run`을 붙인다.
     - 같은 버전이 npm에 있거나 `workspace:*` 의존 대상이 npm에 없으면 배포 전에 멈춘다. `--dry-run`에서는 의존 대상 부재를 경고만 한다.
     - 배포 전에 루트에서 `pnpm verify`를 실행한다.
     - `dev`에서 배포하므로 `pnpm publish --no-git-checks`로 브랜치 검사를 끈다.
   - `npm publish`를 쓰지 않는다. `workspace:*`를 실제 버전으로 바꾸는 쪽은 pnpm이다.
   - 로컬 배포에는 provenance가 붙지 않는다. provenance는 `release.yml`이 붙인다.
   - 새 패키지를 모두 배포하고 4번 등록을 마친 뒤에 `main`에 push한다. 먼저 push하면 `release.yml`이 새 패키지를 OIDC로 배포하려다 실패할 수 있다. 이 동작은 추정이다.
4. npmjs.com의 패키지 설정 "Trusted Publisher"에 GitHub Actions를 등록한다.
   - Organization or user: `cp949`
   - Repository: `xx-libs`
   - Workflow filename: `release.yml`
5. 등록을 마친 뒤 배포 흐름을 따른다.

## 저장소 설정

- `main`에 보호 규칙을 두면 `github-actions`가 태그를 push할 수 있어야 한다.
- 워크플로 권한은 `release.yml`의 `permissions`가 정한다. 저장소 기본 권한이 읽기 전용이어도 동작한다.

## 인증

- npm 토큰을 저장소 비밀값에 두지 않는다.
- 워크플로의 `id-token: write` 권한으로 얻은 OIDC 토큰이 인증을 대신한다.
- trusted publishing은 이 Node에 번들된 npm CLI가 지원해야 한다. `actions/setup-node`에 `registry-url`을 지정하지 않는다. 지정하면 만들어지는 `.npmrc`가 OIDC 인증을 가린다.

## 실패했을 때

- `pnpm verify` 실패: 배포 단계에 가지 않는다. 원인을 고쳐 다시 push한다.
- 처리하지 않은 changeset 때문에 실패: `pnpm changeset version`을 실행해 커밋하고 다시 push한다.
- 배포 단계 인증 실패: 해당 패키지의 trusted publisher 등록 값(저장소, 워크플로 파일명)을 확인한다.
- 일부 패키지만 배포되고 중간에 실패: 같은 `main` 커밋으로 워크플로를 다시 실행한다. `changeset publish`는 npm에 이미 있는 버전을 건너뛴다.

## 확인하지 않은 사항

- 워크플로를 GitHub에서 실행한 적이 없다.
- `changeset publish`가 이 저장소의 pnpm 설정에서 OIDC 인증으로 배포되는지 확인하지 않았다.
- 첫 배포 결과로 위 절차를 확정한다.
