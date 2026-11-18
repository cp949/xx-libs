import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // 문법을 Chrome 75가 읽는 수준으로 낮춘다. 이 패키지는 타입 선언만 있어 런타임 코드가 비어 있다.
  target: 'chrome75',
  platform: 'neutral',
  dts: true,
  tsconfig: 'tsconfig.build.json',
  sourcemap: true,
  clean: true,
});
