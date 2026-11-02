# 2026-11-03 · D5：五个页签体补渲染 + 台账 live 路径修复（skip 归零）

状态：implemented（2026-11-03；A- D5 批次）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 评分 GAP：`company-tabs` 53.7%；`ledger.spec` 的 live 档因路径停在 v2 布局而永久 skip（3 例）。

## 决定

1. 新增 `tests/client/company-tabs-body.spec.ts`：静态渲染 `BoardTab` / `DagTab` / `BudgetTab` /
   `TasksTab` / `PresenceTab`，断言标题与空态；与 `panel-frame.spec` 联跑后 `company-tabs.tsx`
   **53.7% → 75.92% stmt**（branch 36.36% → 49.09%）。
2. 修 `tests/company/ledger.spec.ts` 的 live 路径：`company-workspace/kb/...` → `company-workspace/.dsh-company/kb/...`
   （`deliverables-archive` 同）。此前路径是 v2 布局，`hasLive` 永远 false ⇒ 3 例**永久静默 skip**；
   修后 dev home 6 例全跑，fresh clone 仍按设计 skip。

## 输掉的方案

- **只补 company-tabs 的 PanelFrame。** 五个页签体（146-281 行）仍没人渲染；整页空白可全绿。
- **接受 live 台账 skip。** 它掩盖了路径迁移错误；skip 不是“在某处跑过”的证据。
- **给 skip 加“预期 3 个”守卫。** 路径已错，守卫只会把错误钉成常态；先修路径。

## 验证（实跑）

```text
npx vitest run tests/client/company-tabs-body.spec.ts tests/client/panel-frame.spec.ts --coverage
# company-tabs.tsx | 75.92 stmt / 49.09 branch
npx vitest run tests/company/ledger.spec.ts
# 6 passed（此前 3 passed + 3 skipped）
pnpm test
# 134 files / 1073 tests（0 skipped on this dev home）
```

红证：修路径前 `ledger.spec` 只跑 3 例、`hasLive=false`；修后 6 例真跑。页签 body 的“标题/空态”断言
在组件不渲染时直接红。

## 后果与边界

- fresh clone 没有 `.dsh-company/kb/motion-ledger.md`，live 3 例仍会 skip；这是 dev-only 数据的边界，
  已在 spec 头注写明。当前 dev home 上跳过 = 0。
- `host/catalog.ts` 58.9% 仍未补 handler 集成；`presets` 真挂载仍归 `preset-smoke`（门外）。
