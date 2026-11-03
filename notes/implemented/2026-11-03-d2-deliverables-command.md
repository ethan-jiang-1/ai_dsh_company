# 2026-11-03 · D2：`/deliverables audit` 命令抽出 + 直测

状态：implemented（2026-11-03；七维复评 Phase 2 续）

> 上游 = D2 报告「src/index.ts 的 apply 285 行、8 个关注点；`/deliverables` 命令 99-129 行内置」。
> 前例 = [catalog 三分](./2026-11-03-d2-catalog-split.md) / [context-wiring 抽出](./2026-11-03-d2-context-wiring-extraction.md)。

## 决定

- `/deliverables audit …` 从 `src/index.ts` 的 `apply` 闭包移到 `host/deliverables-command.ts`：
  - `parseDeliverablesAudit(rawInput)` 纯解析（audit / path 可含空格 / true|false）；
  - `registerDeliverablesCommand(ctx, options)` 只做 dataBlocked、账本、`auditLedger`、重生成索引、export；
  - `audit` / `regenerate` 可注入（测试用），缺省真实实现。
- `src/index.ts` 的 apply 少一段命令注册，`auditLedger` import 随之移除。

## 输掉的方案

- **只把 handler 抽成函数、注册留 index。** 测试仍要造 Cordis ctx；注册面与逻辑仍耦合。
- **用 host-composition 间接覆盖。** 那条 spec 起真组合、只断言命令名/一条路径，覆盖不到解析分支
  （用法错误 / 非 true|false / 无账本）。
- **把 `audit` 做成必填依赖。** 生产调用点要显式传真实函数，增加入口噪声；可选注入更窄。

## 验证（实跑，2026-11-03 12:1x +08）

```text
npx vitest run tests/company/deliverables-command.spec.ts   # 5 passed
pnpm test                                                   # 139 files / 1107 tests
pnpm verify                                                 # ALL PASS
node ./node_modules/typescript/bin/tsc -b packages/company-pack  # exit 0
```

## 事实落点

- 命令注册/解析新家 = `packages/company-pack/src/host/deliverables-command.ts`；
  `src/index.ts` 只保留一行 `registerDeliverablesCommand(...)`。
- 0.8.5 之后又改了 pack 源码；下一次发布需 bump 0.8.6（本刀不单独发）。
