---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-319：刷新页面后挂起的问询从「待办」消失——跨会话重建只配审批，question 只靠活体登记

> 严重级别：P2（次要偏重：待办页把问询与审批都算「等你处理」；审批能重建，问询刷新即丢，用户可能一直不知道有人在等回答）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

同一工作区另一个会话里有一个未答的 `ask_user_question`：

- 当前页面在场时：待办「等你处理」能看到（活体 `user-questions/request` 观察者登记）。
- 刷新页面/后开观察窗：问询消失；待办只剩审批；空态可能说「没有等你的事」。
- 官方问询 UI（该会话里的 question 卡）仍在；但待办聚合面不再指向它。

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/wiring/attention-observers.ts`（只登记活体 question）；`AttentionTab` 的 `history` 只走 `readPendingAcrossSessions` → `pendingApprovals`（审批）；`remote.session.page` 没有 question 重建。
- 数据面 = `user-questions/request` 事件。

## 复现

1. 同工作区 A 会话产生一个未答 `user-questions/request`（模型 `ask_user_question`）。
2. 打开/切到 B 会话，打开「待办」→ 能看到 A 的问询（活体）。
3. 刷新页面 → 再次打开「待办」。
4. 期望：问询仍在，或明确说「问询不跨刷新」；实际：消失。

（本轮未能让真模型调用 `ask_user_question`（turn 直接收口），所以这里是代码路径复现；活体路径已有观察者 spec。）

## 根因与证据

- `attention-observers.ts:38-50`：question 只在 `remote.$on('user-questions/request')` 时 `attention.begin(...)`；没有历史重建。
- `attention-history.ts` 的 `readSessionEvents`/`readPendingAcrossSessions` 只调用 `pendingApprovals`，没有 question 配对（`user-questions/request` ↔ 回答/取消）。
- `AttentionTab` 的 `history` 只来自 `readPendingAcrossSessions`；`live` 只覆盖本页在场期。
- BUG-288/304 的修复明确只覆盖审批（`pendingApprovals`），question 未纳入。

## 失败类与同类排查

**失败类 = 同一 UI 合同下两类条目，只有一类有历史重建**。同类：

- 审批：活体 + 历史重建（288/304/305）。
- 问询：只有活体（本卡）。
- 升级/完成：只有 follow 流；它们本身不持久，可接受；问询是「必须答」的待办，不可丢。
- 预览/完成通知不是「等你处理」；不混。

## 修复方案与范围

- **根因修法**：跨会话重建同时配对 `user-questions/request` 与答案/取消事件，产出 question 条目；或持久化待答问询，页面重开时读回。
- 问询没有平台 id 时用事件 seq/time（BUG-312 已合成 live id；历史也要稳定 key）。
- **判据**：刷新后未答问询仍在；已答/取消后消失；同文两条问询不合并；审批不回归。
- **不改**：官方问询 UI；question 活体 id 合成。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 刷新页面后未答 question 仍出现在待办「等你处理」；
- 答完/取消后从待办消失；
- 两条同文 question 各自可处理；审批 288/304/305 不回归；
- 历史重建 spec + 真页面一条。
