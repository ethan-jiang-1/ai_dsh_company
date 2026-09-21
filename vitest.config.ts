import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// keyless 层（单元/集成）：`pnpm test`。
// 源码面解析：经 tsconfig paths 把 @deepseek-ai/* 指到 vendor 的 src（DSH 纪律：
// vitest 一律走 paths 指 src，绝不走 exports 到 lib——否则加载第二份模块单例）。
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    include: ['tests/**/*.spec.ts'],
    testTimeout: 30_000,
  },
})
