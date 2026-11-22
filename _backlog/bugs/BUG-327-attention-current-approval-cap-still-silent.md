---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-327：320 只把「历史会话」的审批截断数带回来了——当前会话自己的 `.capped` 仍被丢掉

> 严重级别：P2（次要偏重：当前会话 6 条挂起审批，面板仍只显 5 条；`history.approvalsCapped` 只统计别的会话，当前会话没有提示）｜发现：2026-11-23（E2E 第六轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-23 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

当前会话里有 6 条未答 `approval/asked`：

- `pendingApprovals(events, leadId)` 返回 `{ items: 5 条, capped: 1 }`；
- `AttentionTab` 只取 `.items`：
  ```ts
  mergeAttention(live, [...pendingApprovals(events, leadId).items, ...history.items, ...])
  ```
- 面板的「审批流被截」行只读 `history.approvalsCapped`（跨会话结果），当前会话的 `capped=1` 没有进入任何状态；
- 6 条只显示 5 条，没有「还有 1 条」。

`pendingAsks(events, leadId).capped` 同样被丢掉；当前会话的问询+审批 cap 也不提示。

## 运行面

- **面 = client 待办**：`AttentionTab.tsx` 的 `items` useMemo 与 `history.approvalsCapped` 行；`pendingApprovals` / `pendingAsks` 在 `lib/presence/attention.ts`。
- 数据面 = 当前会话 follow 事件流。

## 复现

1. 当前会话造 6 条未答 `approval/asked`（或用纯函数 mock）。
2. 打开「待办」。
3. 期望：5 条 + 「还有 1 条审批未显示」；实际：5 条，无提示。

纯证据：

```sh
node --import tsx/esm -e "
import { pendingApprovals } from './packages/company-pack/src/lib/presence/attention.ts'
const asked=(id,t)=>({type:'approval/asked',time:t,data:{id,toolName:'bash'}})
console.log(pendingApprovals(Array.from({length:6},(_,i)=>asked('a'+i,i+1)),'s').capped)
"
# 1
```

## 根因与证据

- `AttentionTab.tsx:161` 附近：
  ```ts
  const items = useMemo(
    () => mergeAttention(live, [...pendingApprovals(events, leadId).items, ...history.items, ...streamAttention(...)]),
    ...
  )
  ```
  `.capped` 没有解构/传递。
- 面板只渲染 `history.approvalsCapped`（`readPendingAcrossSessions` 汇总的跨会话值）。
- 320 的修复把 `PendingApprovals.capped` 带回来了，但只接在 `readPendingAcrossSessions` 上；当前会话路径漏接。
- `pendingAsks` 同理。

## 失败类与同类排查

**失败类 = 边界状态只接到一条消费路径，另一条仍丢**。同类：

- 跨会话审批 cap：已接（history.approvalsCapped）。
- 当前会话审批/问询 cap：本卡。
- 当前会话事件窗 1000：已接（eventsTruncated）。
- 候选 20：已接（candidates.capped）。
- 这是「同一 cap 两个来源，只接了一个」。

## 修复方案与范围

- **根因修法**：`AttentionTab` 同时保存当前会话 `pendingAsks(events, leadId).capped` 与历史 `history.approvalsCapped`，两者求和后显示；空态压住条件也包含它。
- 若 `pendingAsks` 的 capped 包含问询，文案改为「审批/问询还有 N 条未显示」，不要只说审批。
- **判据**：当前会话 6 条 → 5 + 1；历史 6 条 → 5 + 1；两者都有 → 合计；5 条以内无提示；zh/en 同步。
- **不改**：`STREAM_ITEM_CAP=5`；跨会话汇总。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 当前会话超过 5 条审批/问询时显示被截数；
- 历史与当前会话的 capped 合计不重复/不遗漏；
- 5 条以内无提示；zh/en 同步；
- 组件 spec + 真页面一条。
