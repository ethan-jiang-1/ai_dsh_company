---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-330：问询已进「等你处理」，边界/空态文案和 capped 字段却仍只写「审批」

> 严重级别：P2（表达层/语义：319 把 question 并入 waiting 与 pendingAsks，但上游字段仍叫 approvalsCapped，四条文案仍说 approvals；问询被截时用户看到「审批未显示」）｜发现：2026-11-23（E2E 第六轮）｜状态：已修｜审查：agent — 逐条核对已修判定（边界组合矩阵六档 + 单一空态判据）
>
> **留痕**：commit fa7a7a8c（与 327/328/330 同批：边界收一个对象，材料性；批次 Note 覆盖）。

## 症状

319 之后「等你处理」同时包含审批与问询；`pendingAsks` 的 `capped` 也是两者合计。但：

- `PendingAcrossSessions.approvalsCapped` 名字与来源是 `pendingAsks(...).capped`（含 question）；
- 面板文案：
  - `attention.approvalsCapped`: `还有 N 条挂起审批未显示（单会话上限 5 条）`；
  - `attention.eventsWindow` / `historyWindow`: `更早的挂起审批可能没出现在这里`；
  - `attention.emptyWaiting`: `…挂着的审批都会出现在这里`。

如果被截的是 6 条 **question**（没有审批），面板仍说「还有 1 条挂起审批未显示」；空态解释也只提审批。

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/presence/attention-history.ts` 的 `approvalsCapped`；`tabs/AttentionTab.tsx` 的三个边界行/空态；`locales.ts` 四条 key。
- 数据面 = `pendingAsks` 的 `{ approvals + questions }`。

## 复现

1. 跨会话某会话有 6 条未答 question、0 条审批。
2. 打开「待办」。
3. 期望：「还有 1 条待办（问询）未显示」；实际：`还有 1 条挂起审批未显示`。

## 根因与证据

- `attention-history.ts:121-125`（319 diff）：`const asks = pendingAsks(...); return { items: asks.items, capped: asks.capped, ... }`；字段仍叫 `approvalsCapped`。
- `attention.ts:... pendingAsks`：`capped = approvals.capped + max(0, merged.length - STREAM_ITEM_CAP)`，包含 questions。
- `locales.ts:89/428`：文案写死「审批 / approvals」；`:87/:91/:430` 同；`:93/:432` 空态同。
- `AttentionTab` 的 `waiting` 包含 `kind==='question'`；文案与数据不同步。

## 失败类与同类排查

**失败类 = 数据模型扩了类别，文案/字段名没跟上**。同类：

- 319 修了问询条目，但只改了条目来源；边界/空态文案未改。
- 325 是身份；327 是当前 cap 漏接；本卡是 capped 的语义/文案。
- 不是「审批更重要」：问询同样是必须答的待办。

## 修复方案与范围

- **根因修法**：字段改 `asksCapped`（或拆分 `approvalsCapped`/`questionsCapped`）；文案改为「待办/问询或审批」；空态解释覆盖 question。
- 若想保留审批细分，返回 `{ approvalsCapped, questionsCapped }`，面板分行。
- **判据**：question-only cap → 文案说问询/待办；approval-only cap → 审批；混合 → 合计；空态解释覆盖两类；zh/en 同步。
- **不改**：`STREAM_ITEM_CAP=5`；`pendingAsks` 合并顺序。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- question-only cap 不再被称为审批；
- 空态/窗口文案覆盖 question；
- zh/en 同步；混合 cap 计数正确；
- 纯函数 spec + 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/attention.ts`（`AttentionBoundaries` + `hasBoundary` + `ASKS_CAP`）、`packages/company-pack/src/client/presence/attention-history.ts`（`approvalsCapped` → `asksCapped`）、`packages/company-pack/src/client/tabs/AttentionTab.tsx`、`packages/company-pack/src/client/locales.ts`
- 红：`vitest run tests/client/tabs/attention-tab.spec.ts tests/client/wiring/attention.spec.ts` —— `asksCapped` 改回只统计审批后「合集 capped 计入」用例失败 —— 去掉 `ownAsks.capped` / 把空态改回手写三条件后，边界组合矩阵中「本会话审批被截」与「候选被截」两条失败（提示不出现、空态照旧）
- 绿：`vitest run tests/client/tabs/attention-tab.spec.ts tests/client/wiring/attention.spec.ts` —— 21/21 + 40/40（六维全清才 `hasBoundary=false`；六种边界各自让提示出现且空态被压住）
- 提交：commit fa7a7a8c
