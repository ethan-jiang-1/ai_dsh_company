import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// keyless 层（单元/集成）：`pnpm test`。
// 源码面解析：经 tsconfig paths 把 @deepseek-ai/* 指到 vendor 的 src（DSH 纪律：
// vitest 一律走 paths 指 src，绝不走 exports 到 lib——否则加载第二份模块单例）。
export default defineConfig({
  // 单一 React：干净 clone 的 vendor 安装会落下第二份 react（vendor/dsh/node_modules），
  // 与根 react-dom 的 dispatcher 不同源 → 源码面组件在 react-dom/server 下 hooks 报 null
  // （2026-11-13 clean clone 实测 tab-copy.spec）。dedupe 让测试面只保留根副本。
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [tsconfigPaths({
    // vendor/dsh/tsconfig.base.json 同时列为原生项目：extends 链继承的 paths 在本仓根解析时
    // 基址错位（实测 @deepseek-ai/dsh-client-modules/client 解析出 packages/packages 翻倍路径、
    // 落到构建产物 lib）——原生项目让同一份 paths 以 vendor 根为基址正确落 src 源码面。
    projects: ['./tsconfig.json', './vendor/dsh/tsconfig.base.json'],
  })],
  test: {
    include: ['tests/**/*.spec.ts'],
    testTimeout: 30_000,
    // coverage = **关键模块阈值档**（2026-11-03 Phase 4；原 2026-10-21 观察档升级）。
    // 只统计自写树——tsconfig paths 按设计把 @deepseek-ai/* 指向 vendor src，不收窄会把 vendor
    // 全树算进来淹没读数。全局不设阈值；下列高风险模块有下限，`pnpm test:coverage` 低于即红。
    // `pnpm test` 仍不跑 coverage（秒级）；阈值是发布前/独立轮的手动棘轮，不塞进 pre-push。
    coverage: {
      provider: 'v8',
      include: ['packages/company-pack/src/**/*.{ts,tsx}', 'tools/lib/**/*.mjs'],
      reporter: ['text'],
      thresholds: {
        'packages/company-pack/src/client/wiring/context-wiring.ts': { statements: 90, branches: 85 },
        'packages/company-pack/src/client/wiring/member-navigation.ts': { statements: 95, branches: 80 },
        'packages/company-pack/src/client/wiring/title-state.ts': { statements: 95, branches: 90 },
        'packages/company-pack/src/host/workspace-resolution.ts': { statements: 85, branches: 75 },
        'packages/company-pack/src/host/runtime-guard.ts': { statements: 70, branches: 60 },
        'packages/company-pack/src/client/index.ts': { statements: 65, branches: 10 },
        'packages/company-pack/src/client/data/use-company-data.ts': { statements: 95, branches: 85 },
        'packages/company-pack/src/host/deliverables-command.ts': { statements: 90, branches: 70 },
        'packages/company-pack/src/host/catalog-state.ts': { statements: 80, branches: 70 },
        'packages/company-pack/src/host/presented-ledger.ts': { statements: 70, branches: 55 },
      },
    },
  },
})
