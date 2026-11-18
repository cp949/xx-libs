// Chrome 75에 없는 API 이름이 src에 있으면 실패한다.
// - 타입 검사(ES2019 lib)가 못 잡는 DOM API와 ES2020 이후 API를 이름으로 잡는다.
// - 주석은 지우고 검사한다. 이유를 설명하는 주석이 이름을 언급해도 통과한다.
// - 이름 검색이라 동적 접근(`obj[name]()`)은 못 잡는다. 한계는 README "지원 환경"에 있다.
// - 사용: `node scripts/check-banned-api.mjs [검사할 디렉터리]`. 기본은 `src`다.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));

// `allow`로 규칙을 적용하지 않을 파일을 PACKAGE_DIR 기준 경로로 지정할 수 있다.
const RULES = [
  { name: 'Object.hasOwn (Chrome 93)', pattern: /\bObject\.hasOwn\(/ },
  { name: 'Array/String/TypedArray.at (Chrome 92)', pattern: /\.at\(/ },
  { name: 'structuredClone (Chrome 98)', pattern: /\bstructuredClone\(/ },
  { name: 'String.replaceAll (Chrome 85)', pattern: /\.replaceAll\(/ },
  {
    name: 'findLast/findLastIndex (Chrome 97)',
    pattern: /\.findLast(Index)?\(/,
  },
  {
    name: 'toSorted/toReversed/toSpliced (Chrome 110)',
    pattern: /\.(toSorted|toReversed|toSpliced)\(/,
  },
  { name: 'Array.fromAsync (Chrome 121)', pattern: /\bArray\.fromAsync\(/ },
  {
    name: 'Promise.allSettled (Chrome 76)',
    pattern: /\bPromise\.allSettled\(/,
  },
  { name: 'Promise.any (Chrome 85)', pattern: /\bPromise\.any\(/ },
  { name: 'AggregateError (Chrome 85)', pattern: /\bAggregateError\b/ },
  { name: 'crypto.randomUUID (Chrome 92)', pattern: /\brandomUUID\(/ },
  // 타입 검사는 @types/node(테스트와 스크립트용) 때문에 Node 전역을 막지 못한다.
  { name: 'process (Node 전역)', pattern: /\bprocess\.(env|argv|cwd|nextTick|platform|version)/ },
  { name: 'Buffer (Node 전역)', pattern: /\bBuffer\b/ },
  { name: 'setImmediate (Node 전역)', pattern: /\bsetImmediate\(/ },
];

/**
 * 블록 주석과 줄 주석을 지우되 줄 수는 유지한다.
 * 따옴표·템플릿 문자열 안의 `//`와 `/*`는 주석으로 보지 않는다. 정규식 리터럴은 구분하지 않는다.
 */
function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < source.length) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
    } else if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else {
      if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      out += ch;
      i += 1;
    }
  }
  return out;
}

function* tsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* tsFiles(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

const target = resolve(process.argv[2] ?? join(PACKAGE_DIR, 'src'));
const violations = [];
for (const file of tsFiles(target)) {
  const rel = relative(PACKAGE_DIR, file);
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  for (const rule of RULES) {
    if (rule.allow?.includes(rel)) continue;
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        violations.push(`${rel}:${index + 1}: ${rule.name}${rule.hint ? ` ${rule.hint}` : ''}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`Chrome 75에 없는 API를 쓴다:\n${violations.map((v) => `  ${v}`).join('\n')}`);
  process.exit(1);
}
console.log('check-banned-api: 통과');
