# 2026-11-03 · Phase 4：关键模块覆盖阈值（`pnpm test:coverage`）

状态：implemented（2026-11-03；七维复评 Phase 4）

> 上游 = 2026-11-03 fresh 复评 D5「覆盖率是观察值，无阈值；高风险模块靠人记得看」。
> 前置 = [context-wiring 抽出](./2026-11-03-d2-context-wiring-extraction.md) +
> [member/title 抽出](./2026-11-03-d2-member-title-extraction.md)（先把可测单元抽出来，再设棘轮）。

## 决定

- `vitest.config.ts` 的 coverage 从**纯观察档**升级为**关键模块阈值档**；全局不设阈值（vendor/tools 噪声会淹），
  只给 10 个高风险模块下限：

| 模块 | statements | branches | 当前 |
|---|---|---|---|
| `client/context-wiring.ts` | 90 | 85 | 95.00 / 93.33 |
| `client/member-navigation.ts` | 95 | 80 | 100 / 83.33 |
| `client/title-state.ts` | 95 | 90 | 100 / 93.75 |
| `host/workspace-resolution.ts` | 85 | 75 | 92.15 / 82.69 |
| `host/runtime-guard.ts` | 70 | 60 | 75.00 / 65.38 |
| `client/index.ts` | 65 | 10 | 73.11 / 16.66 |
| `client/use-company-data.ts` | 95 | 85 | 97.91 / 86.95 |
| `host/deliverables-command.ts` | 90 | 70 | 92.30 / 76.92 |
| `host/catalog-state.ts` | 80 | 70 | 80.76 / 76.00 |
| `host/presented-ledger.ts` | 70 | 55 | 72.89 / 59.70 |

- **不进 pre-push**：coverage 全量 ~15s（含 transform 更高），且 `pnpm test` 是秒级层；阈值是
  `pnpm test:coverage` 的手动棘轮（发布前/改这些模块时），不替代 keyless 回归。
- `docs/testing.md` §5 写明跑法与边界。

## 输掉的方案

- **全局阈值。** vendor 经 tsconfig paths 进统计会被收窄，但 `tools/lib` 的 0% 探针（probe-window 等）会
  把全局拉红；按模块设下限才表达“哪些面是高风险”。
- **把 coverage 塞进 pre-push。** 与 `pnpm test` 秒级预算冲突；且发布前才需要看覆盖率。
- **只留观察档。** 2026-10-21 起一直观察，结果高风险模块掉到 12% 也没人红；现在先有测试再设棘轮。

## 验证（实跑，2026-11-03 11:3x +08）

```text
pnpm test:coverage
# exit 0；10 个阈值全过（读数见上表）

# 红证：把 context-wiring statements 阈值临时改成 99
npx vitest run --coverage
# exit 1：ERROR: Coverage for statements (95%) does not meet
#   "packages/company-pack/src/client/wiring/context-wiring.ts" threshold (99%)
# 还原 90 → exit 0
```

## 余项

- `client/index.ts` branches 仍 16.66；阈值 10 是“防再掉”，不是目标。下一步若继续拆注册编排，再随之上调。
- `host/catalog.ts` 的 presented-ledger 拆分、tests 进 tsc 的两面工程仍待独立轮。
