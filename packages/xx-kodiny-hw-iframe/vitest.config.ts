import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 소스가 window, document, postMessage를 쓰므로 jsdom에서 돌린다.
  test: { environment: 'jsdom' },
});
