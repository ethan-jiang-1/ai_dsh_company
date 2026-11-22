---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-320：同一会话 6 条挂起审批只显示 5 条——`STREAM_ITEM_CAP` 静默截掉，没有任何「还有 1 条」

> 严重级别：P2（次要偏重：审批是必须答的待办；同一会话同时挂 6 条时，第 6 条从历史重建里消失，空态/计数都不说）｜发现：2026-11-22（E2E 第五轮）｜状态：已修｜审查：agent — 逐条核对已修判定（边界 / 边界+1 各一档）
>
> **留痕**：commit ceb575dd（与 317/318/320 同批：注意力边界，材料性；批次 Note 覆盖）。

## 症状

同一会话的日志里有 6 条 `approval/asked`，全部未答。刷新页面后「待办」：

- 只显示最近 5 条；
- 第 6 条（最早的）消失；
- 没有「还有 1 条审批被截断」的提示。

纯证据：

```sh
node --import tsx/esm -e "
import { pendingApprovals } from './packages/company-pack/src/lib/presence/attention.ts'
const asked = (id, time) => ({ type:'approval/asked', time, data:{ id, toolName:'bash', reason:'x' } })
const events = Array.from({length:6}, (_,i)=>asked('a'+i, i+1))
console.log(pendingApprovals(events, 's').map(i => i.id))
"
# [ 'a5', 'a4', 'a3', 'a2', 'a1' ]  // a0 丢失
```

## 运行面

- **面 = lib 注意力 + client 待办**：`packages/company-pack/src/lib/presence/attention.ts` 的 `pendingApprovals` / `STREAM_ITEM_CAP`；`AttentionTab` 的 `history.items` / `pendingApprovals(events, leadId)`。
- 数据面 = `approval/asked` / `approval/decided`。

## 复现

1. 同一会话造 6 条未答 `approval/asked`（或 mock `AttentionEventLike`）。
2. 刷新页面，打开「待办」。
3. 期望：6 条都可见，或至少「显示 5 / 共 6」；实际：5 条，无提示。

## 根因与证据

- `attention.ts:85`：`export const STREAM_ITEM_CAP = 5`。
- `pendingApprovals` 末行（`:182`）：
  ```ts
  return [...asked.values()].sort((a, b) => b.time - a.time).slice(0, STREAM_ITEM_CAP)
  ```
  返回 `AttentionItem[]`，没有 `total`/`truncated`；调用方无法知道有第 6 条。
- `streamAttention` 同样 `slice(-STREAM_ITEM_CAP)` 用于 escalation/completion；告知类可接受，审批类不可。
- 活体审批走 `live` 数组，不经过这个 cap；刷新后走历史重建，才会暴露。

## 失败类与同类排查

**失败类 = 必须处理的条目被固定上限截断，结果态不携带截断数**。同类：

- 跨会话 800 事件窗口：有 `window` 提示（304/305）。
- 当前会话 1000 事件窗口：卡 317。
- 审批 5 条：本卡。
- 告知类 completion/escalation 5 条：可接受（不是必须答）。

## 修复方案与范围

- **根因修法**：`pendingApprovals` 返回 `{ items, total }`（或 `truncated`）；面板在 `total > items.length` 时显示「显示 5 / 共 6」并可展开/分页。
- 或提高审批 cap 到与列表预算一致，并保留计数。
- **判据**：6 条 → 5 条 + 「共 6」；5 条 → 无提示；答完一条后 5 条 + 计数更新；zh/en 同步。
- **不改**：告知类 `streamAttention` 的 5 条；跨会话 800。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 挂起审批超过 5 条时，面板明确显示总数/截断；
- 5 条以内无提示；
- 处理一条后计数递减；
- 纯函数 spec + 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/attention.ts`（`pendingApprovals` → `{items, capped}`）、`packages/company-pack/src/client/presence/attention-history.ts`（`approvalsCapped`）、`packages/company-pack/src/client/tabs/AttentionTab.tsx`（`eventsSeen` + 三行边界）、`packages/company-pack/src/client/locales.ts`
- 红：`vitest run tests/client/wiring/attention.spec.ts tests/client/tabs/attention-tab.spec.ts tests/client/presence/attention-history.spec.ts` —— `pendingApprovals` 不带 `capped` 后「多出上限 ⇒ capped = 1」失败 —— 把三处边界去掉（`capped` 恒 0、不记 `eventsSeen`）后对应断言失败（面板不提示、空态仍说「没有等你的事」）
- 绿：`vitest run tests/client/wiring/attention.spec.ts tests/client/tabs/attention-tab.spec.ts tests/client/presence/attention-history.spec.ts` —— 31/31 + 14/14 + 16/16
- 提交：commit ceb575dd
