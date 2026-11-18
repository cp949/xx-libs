#!/usr/bin/env bash
# packages/ 아래 패키지 하나를 npm에 배포한다. 새 패키지의 첫 배포를 로컬에서 할 때 쓴다.
# 사용: ./release.sh <패키지 폴더 이름> [pnpm publish 옵션...]
# 예:   ./release.sh xx-kodiny-pet-proto
#       ./release.sh xx-kodiny-pet-parent --otp=123456
#       ./release.sh xx-kodiny-pet-parent --dry-run
# 절차와 이유는 docs/release.md의 "새 패키지 추가 때 할 일"을 따른다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "사용: ./release.sh <패키지 폴더 이름> [pnpm publish 옵션...]" >&2
  echo "예:   ./release.sh xx-kodiny-pet-parent --otp=123456" >&2
  echo "패키지:" >&2
  for dir in "$ROOT"/packages/*/; do echo "  $(basename "$dir")" >&2; done
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

# `packages/xx-foo`처럼 경로로 줘도 폴더 이름만 쓴다.
NAME="$(basename "${1%/}")"
shift
PKG_DIR="$ROOT/packages/$NAME"

if [ ! -f "$PKG_DIR/package.json" ]; then
  echo "오류: packages/$NAME/package.json이 없다." >&2
  usage
  exit 1
fi

# 나머지 인자는 pnpm publish에 그대로 넘긴다. --dry-run이 있으면 실제 배포를 하지 않는다.
DRY_RUN=0
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then DRY_RUN=1; fi
done

# package.json에서 값을 읽는다. 인자는 node 표현식이다.
pkg_field() {
  node -e "const p = require(process.argv[1]); console.log($1)" "$PKG_DIR/package.json"
}

PKG_NAME="$(pkg_field 'p.name')"
PKG_VERSION="$(pkg_field 'p.version')"

echo "대상: $PKG_NAME@$PKG_VERSION"
if [ "$DRY_RUN" = 1 ]; then echo "모드: dry-run (실제로 배포하지 않는다)"; fi

# 같은 버전이 npm에 있으면 멈춘다. 같은 버전은 다시 올릴 수 없다.
if [ -n "$(npm view "$PKG_NAME@$PKG_VERSION" version 2>/dev/null || true)" ]; then
  echo "오류: $PKG_NAME@$PKG_VERSION은 이미 npm에 있다. 버전을 올린 뒤 배포한다." >&2
  exit 1
fi

# workspace:* 의존 대상이 npm에 먼저 있어야 한다. 없으면 설치할 수 없는 패키지가 배포된다.
MISSING="$(node -e '
  const fs = require("fs");
  const { execFileSync } = require("child_process");
  const root = process.argv[1];
  const pkg = JSON.parse(fs.readFileSync(root + "/packages/" + process.argv[2] + "/package.json", "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies };
  const byName = {};
  for (const dir of fs.readdirSync(root + "/packages")) {
    const file = root + "/packages/" + dir + "/package.json";
    if (fs.existsSync(file)) byName[JSON.parse(fs.readFileSync(file, "utf8")).name] = JSON.parse(fs.readFileSync(file, "utf8")).version;
  }
  for (const [name, range] of Object.entries(deps)) {
    if (!String(range).startsWith("workspace:")) continue;
    const spec = name + "@" + byName[name];
    let found = "";
    try { found = execFileSync("npm", ["view", spec, "version"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch {}
    if (!found) console.log(spec);
  }
' "$ROOT" "$NAME")"

if [ -n "$MISSING" ]; then
  if [ "$DRY_RUN" = 1 ]; then
    echo "경고: 아래 의존 패키지가 npm에 없다. 실제 배포 전에 먼저 배포해야 한다."
    echo "$MISSING" | sed 's/^/  /'
  else
    echo "오류: 아래 의존 패키지가 npm에 없다. 먼저 배포한다." >&2
    echo "$MISSING" | sed 's/^/  /' >&2
    exit 1
  fi
fi

# 검증이 통과해야 배포한다.
echo "pnpm verify 실행"
(cd "$ROOT" && pnpm verify)

# dev 등 main이 아닌 브랜치에서 배포하므로 pnpm의 브랜치 검사를 끈다.
# workspace:*를 실제 버전으로 바꾸는 쪽은 pnpm이라 npm publish를 쓰지 않는다.
# 배포 전 prepublishOnly가 빌드를 한다.
echo "pnpm publish 실행"
cd "$PKG_DIR"
pnpm publish --no-git-checks "$@"
