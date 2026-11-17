// 빌드한 dist를 package.json의 exports 경로 그대로 ESM(import)과 CJS(require)로 불러, 공개 API가 노출되는지 검사한다.
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
  const esm = await import(pathToFileURL(resolve(PACKAGE_DIR, entry.import.default)).href);
  if (typeof esm.migrateGenFile !== 'function')
    failures.push('ESM: migrateGenFile이 함수가 아니다');
  else console.log('ESM: migrateGenFile =', typeof esm.migrateGenFile);
} catch (error) {
  failures.push(`ESM 로드 실패: ${error.message}`);
}

try {
  const cjs = require(resolve(PACKAGE_DIR, entry.require.default));
  if (typeof cjs.migrateGenFile !== 'function')
    failures.push('CJS: migrateGenFile이 함수가 아니다');
  else console.log('CJS: migrateGenFile =', typeof cjs.migrateGenFile);
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
