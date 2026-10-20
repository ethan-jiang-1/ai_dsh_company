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
    // coverage = **非门禁观察档**（2026-10-21 Phase C5 立：升级地图「coverage 死代码扫描」的可用化；
    // 只统计自写树——tsconfig paths 按设计把 @deepseek-ai/* 指向 vendor src，不收窄会把 vendor
    // 全树算进来淹没读数。跑法 = `npx vitest run --coverage`；不设阈值、不进门禁（先观察）。
    coverage: {
      provider: 'v8',
      include: ['packages/company-pack/src/**/*.{ts,tsx}', 'tools/lib/**/*.mjs'],
      reporter: ['text'],
    },
  },
})
