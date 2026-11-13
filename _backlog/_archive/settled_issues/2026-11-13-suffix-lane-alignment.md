---
status: 已结
opened: 2026-11-13
---

# 推敲：后缀 = lane 的四层对齐（spec / e2e / entry / checks）

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> 审查：agent — 四条命令实跑、naming-contract/verify 全绿；`.spec.ts` 偏差已登记理由
>
> **结论/去向**：note — [2026-11-13-suffix-lane-alignment.md](../../../notes/implemented/2026-11-13-suffix-lane-alignment.md)
>
> **授权边界**：用户 2026-11-13 给出四行对齐表并明确「一次做对」。卡上方案不额外授权，按用户点名实施。

## 问题与期望结果

文件名后缀必须唯一决定证据类型与命令。今天 `checks/smoke/` 混住「真进程 / 真浏览器 / 真 profile / 真 tarball」，
`*-smoke` 一个词说不清；门禁自测也混在其中。

**目标四层**：

| 后缀 | 证据类型 | 命令 | 对应 DSH |
|---|---|---|---|
| `*.spec.ts` | 进程内（vitest） | `pnpm test:spec`（`pnpm test` 兼容别名） | `*.spec.ts` |
| `*.e2e.mjs` | 起真实进程（含 keyless process/built） | `pnpm test:e2e` | `*.e2e.ts` |
| `*.entry.mjs` | 真浏览器 / 真 profile / 真 tarball | `pnpm test:entry` | web/built 入口面 |
| `tests/checks/*.test.mjs` | 门禁自身 | `pnpm test:checks` | `.github/**/*.test.mjs` |

**与用户表的唯一偏差**：进程内层保留 `.spec.ts`（TypeScript）。理由：246 个类型化 spec 改 `.mjs` = 降级为 JS
并丢掉 `tests/` 的 tsc 面；DSH 原生该行也是 `.spec.ts`。后缀表达 lane，扩展名表达语言。

## 迁移映射

- `checks/smoke/` → `checks/lanes/`；`*-smoke.mjs` → `<base>.e2e.mjs` 或 `<base>.entry.mjs`。
- **e2e（5）**：company-root-process、snapshot-motion、present-catalog、replay、workflow-contract。
- **entry（24）**：client-load、client-error-chain、multi-window-banner、ui-scene、channel-matrix、company-entry、release、
  multi-install、upgrade-while-running、interrupted-install、concurrent-home、isolation-matrix、external-workspace、
  permissions-recovery、revoke-recovery、profile-row、preset、delegation、presence、product-team、attention、human-loop、
  entry-probe、probe-smoke。
- **门禁自测（2）**：gates-negative、two-axis-gates → `tests/checks/*.test.mjs`，`pnpm test:checks`。
- runner：`fast-lane.mjs`、`keyless-lane.mjs` 留 `checks/lanes/`；`keyless-lane --suffix e2e|entry` 供两条命令。
- probes 保持 `-probe.mjs`（手动诊断证据，不进 test:*）。

## 验收标准

1. `checks/smoke/` 不存在；`checks/lanes/` 只有 `*.e2e.mjs` / `*.entry.mjs` / `*-lane.mjs`。
2. 四个命令存在且实跑：`test:spec`（2017 tests）、`test:e2e`、`test:entry`、`test:checks`。
3. 注册表/census/naming-contract/pre-push/CI 与后缀一致；旧路径活跃引用为 0；`pnpm verify` / test / typecheck / lint / dup / ratchet 全绿。
4. 同 diff Note；卡归档，索引更新。
