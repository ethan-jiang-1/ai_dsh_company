# 2026-11-03 · D2/D5：培养背景接线抽出 `context-wiring` 并直测

状态：implemented（2026-11-03；七维复评 Phase 2）

> 上游 = 2026-11-03 fresh 复评 D2/D5「client 入口 12% branch；openMember/registerTitle/makeContextWiring 闭包无直测」。

## 决定

- 把 `makeContextWiring` / `ContextWiringScoped` 从 `client/index.ts` 抽到
  `client/context-wiring.ts`；入口只 import，不再在 apply 闭包里藏 60 行接线。
- 新增 `tests/client/wiring/company-context-wiring.spec.ts` 8 例，覆盖：
  会话在/不在、subagent child（mode 有/缺）、文件 stat ok/!ok/抛错、`contextSources.listSessions`。
  三种“点了没反应”的现场（会话已删 / 原文不在 / stat 抛错）现在有 keyless 证据。
- 入口只保留 `openMember` / `registerTitle` / 两个 inject 块；这两处仍靠 whole-client 间接覆盖，
  不在本刀硬抽（先看这刀收益）。

## 输掉的方案

- **只加 whole-client 断言。** 入口 `apply` 分支多、每次起真 Cordis 组合，失败定位差；抽成纯工厂后
  依赖可注入，8 例毫秒级。
- **把 `openMember` 一起抽。** 它依赖 sessions/retainedBy 与 UI 导航，抽出来要再设计一个注入面；
  本轮先把收益最高、无副作用的背景接线抽掉，避免一次改太多。
- **给 client 入口设低阈值门。** 17.6% branch 仍低；先抽/补测，再谈阈值，避免把低值钉成棘轮。

## 验证（实跑，2026-11-03 11:1x +08）

```text
npx vitest run tests/client/wiring/company-context-wiring.spec.ts   # 8 passed
pnpm test                                                     # 136 files / 1092 tests
pnpm verify                                                   # ALL PASS
npx vitest run --coverage --coverage.reporter=json-summary
# context-wiring.ts: 95.0 stmt / 93.33 branch
# workspace-resolution.ts: 92.15 stmt / 82.69 branch（此前的 12 例直测生效）
# client/index.ts: 67.64 stmt / 17.64 branch（余下为注册/装配分支）
```

## 事实落点

- 新家 = `packages/company-pack/src/client/wiring/context-wiring.ts`；`client/index.ts` 的 import 是唯一入口。
- 证明边界：不证 slot 注册、remote 真装配与 UI 呈现（→ company-client-composition / ui-scene）。
