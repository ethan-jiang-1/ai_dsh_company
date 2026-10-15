import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// keyless 层（单元/集成）：`pnpm test`。
// 源码面解析：经 tsconfig paths 把 @deepseek-ai/* 指到 vendor 的 src（DSH 纪律：
// vitest 一律走 paths 指 src，绝不走 exports 到 lib——否则加载第二份模块单例）。
export default defineConfig({
  plugins: [tsconfigPaths({
    // vendor/dsh/tsconfig.base.json 同时列为原生项目：extends 链继承的 paths 在本仓根解析时
    // 基址错位（实测 @deepseek-ai/dsh-client-modules/client 解析出 packages/packages 翻倍路径、
    // 落到构建产物 lib）——原生项目让同一份 paths 以 vendor 根为基址正确落 src 源码面。
    projects: ['./tsconfig.json', './vendor/dsh/tsconfig.base.json'],
  })],
  test: {
    include: ['tests/**/*.spec.ts'],
    testTimeout: 30_000,
  },
})
