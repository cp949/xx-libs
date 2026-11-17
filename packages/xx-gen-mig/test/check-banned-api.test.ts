import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('../scripts/check-banned-api.mjs', import.meta.url));
const dirs: string[] = [];

// 임시 디렉터리에 소스를 쓰고 검사 스크립트를 실행한다.
const run = (source: string, fileName = 'a.ts') => {
  const dir = mkdtempSync(join(tmpdir(), 'banned-api-'));
  dirs.push(dir);
  writeFileSync(join(dir, fileName), source);
  return spawnSync('node', [SCRIPT, dir], { encoding: 'utf8' });
};

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('check-banned-api', () => {
  it('금지 API가 없는 디렉터리는 종료 코드 0이다', () => {
    const result = run('export const a = 1;\n');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('check-banned-api: 통과');
  });

  it('replaceAll 사용을 잡는다', () => {
    const result = run("export const a = 'a'.replaceAll('a', 'b');\n");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('replaceAll');
    expect(result.stderr).toContain('a.ts:1');
  });

  it('주석 안의 API 이름은 무시한다', () => {
    const result = run('// structuredClone( 은 쓰지 않는다\nexport const a = 1;\n');
    expect(result.status).toBe(0);
  });

  it('at, Object.hasOwn, structuredClone을 모두 잡는다', () => {
    const result = run(
      ['[1].at(0);', 'Object.hasOwn({}, "a");', 'structuredClone({});', ''].join('\n'),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.at');
    expect(result.stderr).toContain('Object.hasOwn');
    expect(result.stderr).toContain('structuredClone');
  });
  it('Node 전역 process, Buffer, setImmediate를 잡는다', () => {
    const result = run(
      ['export const a = process.env.X;', 'Buffer.from("a");', 'setImmediate(() => {});', ''].join(
        '\n',
      ),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('process');
    expect(result.stderr).toContain('Buffer');
    expect(result.stderr).toContain('setImmediate');
  });

  it('문자열 안의 // 뒤에 있는 금지 API도 잡는다', () => {
    const result = run("const u = 'https://x.y'; export const v = [1].at(0);\n");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('a.ts:1');
  });

  it('문자열 안의 // 는 주석으로 보지 않는다', () => {
    const result = run("export const u = 'a // b'; export const v = [1].at(0);\n");
    expect(result.status).toBe(1);
  });

  it('tsx 파일도 검사한다', () => {
    const result = run('export const v = [1].at(0);\n', 'a.tsx');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('a.tsx');
  });
});
