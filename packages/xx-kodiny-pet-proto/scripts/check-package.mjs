// 빌드한 dist를 package.json의 exports 경로 그대로 ESM(import)과 CJS(require)로 불러 본다.
// 이 패키지는 타입 선언만 있어 런타임 export가 없다. 로드가 실패하지 않는지와 타입 선언 파일이 있는지만 확인한다.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(PACKAGE_DIR, 'package.json'), 'utf8'));
const entry = pkg.exports['.'];
const require = createRequire(import.meta.url);

const failures = [];

try {
  await import(pathToFileURL(resolve(PACKAGE_DIR, entry.import.default)).href);
  console.log('ESM: 로드 성공');
} catch (error) {
  failures.push(`ESM 로드 실패: ${error.message}`);
}

try {
  require(resolve(PACKAGE_DIR, entry.require.default));
  console.log('CJS: 로드 성공');
} catch (error) {
  failures.push(`CJS 로드 실패: ${error.message}`);
}

// 타입 선언 파일이 exports 경로에 실제로 있는지도 확인한다.
for (const types of [entry.import.types, entry.require.types]) {
  try {
    readFileSync(resolve(PACKAGE_DIR, types));
  } catch {
    failures.push(`타입 선언 파일이 없다: ${types}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('check-package: 통과');
