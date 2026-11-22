---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-329：en 列表分隔符仍是中文「、」——任务成员/依赖/坏记录 id 全串成 `a、b`

> 严重级别：P2（表达层：单个分隔符不致命，但 en 面板四处出现中文标点，且 `、` 在英文排版里不是合法逗号）｜发现：2026-11-23（E2E 第六轮）｜状态：已修｜审查：agent — 逐条核对已修判定（zh/en 两侧 + 令牌参数不预拼 + 培养面独立）
>
> **留痕**：commit 2e65049c（client 表达层，材料性；批次 Note 覆盖）。

## 症状

en 实例里，列表把多个 id/成员拼成中文顿号：

- 任务板成员：`CE0(standby)、VP-Eng(standby)、COO(standby)`；
- 任务依赖：`Depends task-1、task-2`；
- 看板等待/分叉：`Waiting for task-1、task-2` / `task-1、task-2`；
- 培养坏记录：`3 records are malformed: a.md、b.md、c.md`。

分隔符不随 locale；en 出现中文 `、`。

## 运行面

- **面 = client**：`TeamToolCard.tsx:113-114`、`TasksPanel.tsx:68`、`company-panels.tsx:133/156/157`、`CultivationInbox.tsx:57`。
- 数据面 = 成员/任务 id/文件名数组。

## 复现

1. en 实例打开一个团队会话（任务/成员/依赖都在）。
2. 看「Tasks」的 members 行、任务卡 `Depends`、看板等待、培养坏记录。
3. 期望：en 用 `, ` / `and`；实际：中文 `、`。

## 根因与证据

硬编码 `join('、')`，没有走 locale：

- `TeamToolCard.tsx:113`：`detail = ... \`依赖 ${blockers.join('、')}\``；`:114`：`detailToken = { ..., ids: blockers.join('、') }`。
- `TasksPanel.tsx:68`：`view.members.map(...).join('、')`。
- `company-panels.tsx:133`：`card.blockedBy.join('、')`；`:156/157`：`drift.missing/unmapped.join('、')`。
- `CultivationInbox.tsx:57`：`brokenRecords.join('、')`。
- 这些 join 发生在 `t()` 参数之前，字典拿到的已经是带 `、` 的字符串；zh/en 共用。

## 失败类与同类排查

**失败类 = 列表分隔符写死中文，字典只负责模板不负责拼接**。同类：

- 300/302 修的是动态时间/读失败原因；本卡是列表拼接。
- 316/326 修的是 host 文案；本卡是 client 格式。
- `board.ts` 的 `driftLabel` 也是 `、`，但它不是 client 渲染面（client 有本地化 `driftText`），不列入本卡的主证据。
- 不是「id 里有中文」：这些是产品生成的 id/文件名。

## 修复方案与范围

- **根因修法**：加一个 locale-aware 列表格式（`listJoin(items, locale)`：zh `、`，en `, ` / `and`），或字典键 `list.separator`；所有 join 走它。
- **判据**：en 四处无 `、`；zh 保持 `、`；空列表/单元素不产生多余分隔符；zh/en 同步。
- **不改**：id/成员名本身；模板结构。
- **材料性**：client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- en 任务成员/依赖/看板等待/坏记录列表无中文顿号；
- zh 保持顿号；
- 单元素/空列表不回归；
- 纯函数 spec + en 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/client/ui/list-separator.ts`（新：`listSeparator` / `joinList`）、`packages/company-pack/src/client/locales.ts`（`ui.listSeparator` zh「、」/ en `", "`）、`company-panels.tsx`、`TasksPanel.tsx`、`TeamToolCard.tsx`（令牌参数只带 id 数组，渲染处拼）、`CultivationInbox.tsx` + `cultivation-actions.ts`（`cultivationListSeparator`）、`tests/client/ui/{list-separator,team-tool-card}.spec.ts`
- 红：`vitest run tests/client/ui/list-separator.spec.ts tests/client/ui/team-tool-card.spec.ts` —— 把 `listSeparator` 写死成「、」后 en 侧断言失败（en 出现中文顿号）
- 绿：`vitest run tests/client/ui/list-separator.spec.ts tests/client/ui/team-tool-card.spec.ts` —— 3/3 + 12/12（zh「、」/ en `", "`；joinList 过滤空项；令牌参数里不预拼顿号）
- 提交：commit 2e65049c
