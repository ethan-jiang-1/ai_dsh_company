---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-317：当前会话只留最近 1000 条事件——更早的挂起审批从「待办」消失且无任何提示

> 严重级别：P2（次要偏重：当前会话的长会话里，旧审批被 `MAX_EVENTS` 截掉；面板反而说「没有等你的事」）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

一个长会话（>1000 条事件）里，早期 `approval/asked` 还没答；当前 `AttentionTab` 只保留最近 `MAX_EVENTS=1000` 条事件，`pendingApprovals(events, leadId)` 看不到旧 asked，于是：

- 「等你处理」为空；
- 空态说「没有等你的事」；
- 没有「只扫了最近 1000 条」提示。

跨会话重建只覆盖**别的**会话（`historyKey` 排除 `props.sessionId`），当前会话没有任何补读通道。

纯证据：

```sh
node --import tsx/esm -e "
import { pendingApprovals } from './packages/company-pack/src/lib/presence/attention.ts'
const asked = { type:'approval/asked', time:1, data:{ id:'old', toolName:'bash' } }
const long = [asked, ...Array.from({length:1000}, (_,i)=>({ type:'turn/start', time:i+2, data:{} }))]
console.log(pendingApprovals(long, 's').length, pendingApprovals(long.slice(-1000), 's').length)
"
# 1 0
```

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/tabs/AttentionTab.tsx` 的 `MAX_EVENTS` / `setEvents(...slice(-MAX_EVENTS))`；`pendingApprovals` 在 `lib/presence/attention.ts`。
- 数据面 = follow 流的 `history` + live 帧；当前会话没有 `remote.session.page` 重建。

## 复现

1. 构造一个会话：先写 `approval/asked {id:'old'}`，再追加 >1000 条非审批事件。
2. 打开「待办」。
3. 期望：旧审批仍可见，或至少提示「当前会话只扫了最近 1000 条」；实际：空态「没有等你的事」。

（本轮为纯函数复现；没有造 1001 条真事件，避免污染隔离盘。）

## 根因与证据

- `AttentionTab.tsx:52`：`const MAX_EVENTS = 1_000`。
- `AttentionTab.tsx:115`：
  ```ts
  setEvents(prev => (frame.kind === 'history' ? frame.events : [...prev, frame.event]).slice(-MAX_EVENTS))
  ```
- `AttentionTab.tsx:162`：`pendingApprovals(events, leadId)` 只看被截后的数组。
- `historyKey` 明确 `summary.id !== props.sessionId`（`:132`）；当前会话不参与跨会话补读。
- 304/305 修的是**别的会话**的 800 窗口，并加了 `window` 提示；当前会话的 1000 窗口没有对应状态。

## 失败类与同类排查

**失败类 = 读面有人为上限，但上限状态没有随结果回去**（与 304 同族，另一个窗口）。同类：

- 跨会话 800 窗口：已修，有 `history.window` 提示。
- 当前会话 1000 事件：本卡。
- `pendingApprovals` 的 5 条上限（卡 320）是条目上限，不是事件窗口。
- `streamAttention` 的 5 条是告知上限。

## 修复方案与范围

- **根因修法**：把当前会话也纳入 `readSessionEvents`/`pendingApprovals` 的重建（或单独按 `throughSeq` 分页补读），返回 `window`/`truncated` 状态；面板在 `MAX_EVENTS` 命中时显示「当前会话只扫了最近 N 条」并压住空态。
- 或至少：`events` 被截时保留布尔 `eventsTruncated`，空态改为「可能还有更早的审批」。
- **判据**：1001 条事件 + 早期审批 → 仍可见或明确警告；<1000 无提示；zh/en 同步。
- **不改**：跨会话 800 窗口（已修）；live 帧；`STREAM_ITEM_CAP`。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 当前会话事件截断时，待办不再宣称「没有等你的事」；
- 早期审批可重建或明确提示；
- 短会话（<1000）零回归；
- 纯函数/组件 spec + 真页面一条。
