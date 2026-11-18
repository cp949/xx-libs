import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // 문법을 Chrome 75가 읽는 수준으로 낮춘다. 런타임 API는 낮추지 않는다. tsconfig.build.json의 lib가 막는다.
  target: 'chrome75',
  platform: 'neutral',
  dts: true,
  tsconfig: 'tsconfig.build.json',
  sourcemap: true,
  clean: true,
  // dependencies와 peerDependencies는 번들에 넣지 않는다.
  deps: { neverBundle: ['rxjs', '@cp949/xx-kodiny-iframe-proto'] },
});
