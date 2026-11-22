---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-299：待办按「160 字摘要」去重，两条不同审批会塌成一条；活体条目的全文详情也被丢掉

> 严重级别：P2（次要偏重：待办是「等你处理」的清单，少一条 = 一次审批被藏起来；同源摘要碰撞在多审批时并不罕见）｜发现：2026-11-22（E2E 第二轮）｜状态：已修｜审查：agent — 逐条核对已修判定（四条 keyless 断言 + 观察者两条）
>
> **留痕**：commit f996ac03（client 待办呈现面，材料性；批次 Note 覆盖）。

## 症状

同一会话里有两条**不同 id** 的挂起审批，只要它们的 `toolName` + `reason` 相同（或长理由前 160 字相同），待办只显示一条：

- `pendingApprovals` 返回 2 条（读模型知道有两条）；
- 经 `mergeAttention` 后只剩 1 条（按 `kind + jumpTo + what` 去重，`what` 是折叠后的 160 字摘要）；
- 另一条既不在「等你处理」，也没有任何「已合并/省略」提示。

另：活体登记（`approval/request` 观察者）写入的 `LivePending.detail` 在 `mergeAttention` 的 `live.map` 里被丢掉，列表行 `title={item.detail ?? item.what}` 拿不到全文——刷新后走历史重建才又有 `detail`。同一页面上「刚发生」的审批反而看不到完整理由。

## 运行面

- **面 = lib 读模型 + client 待办面板**：`packages/company-pack/src/lib/presence/attention.ts` 的 `pendingApprovals` / `mergeAttention`；`client/wiring/attention-observers.ts` 的活体登记；`client/tabs/AttentionTab.tsx` 的列表 `title`。
- 数据源 = `approval/asked`（历史）与 `approval/request`（活体），两者都带审批 id / reason。

## 复现

纯函数、无浏览器：

```sh
node --import tsx/esm -e "
import { pendingApprovals, mergeAttention } from './packages/company-pack/src/lib/presence/attention.ts'
const events = [
  { type: 'approval/asked', time: 1000, data: { id: 'approval-a', toolName: 'request_signoff', reason: 'same reason' } },
  { type: 'approval/asked', time: 2000, data: { id: 'approval-b', toolName: 'request_signoff', reason: 'same reason' } },
]
const rebuilt = pendingApprovals(events, 'session-1')
console.log('pendingApprovals =', rebuilt.length)
console.log('mergeAttention =', mergeAttention([], rebuilt).length)
"
```

本轮实测输出：

```
pendingApprovals = 2
mergeAttention = 1
```

两条都是 `kind=approval / jumpTo=session-1`，`what` 都是 `request_signoff：same reason`；`mergeAttention` 的 `seen` 只保留第一条。

## 根因与证据

1. `pendingApprovals` 用审批 id 配对 asked/decided，返回**两条**不同条目（`attention.ts:156-176`）。
2. `mergeAttention` 的去重键是 `kind + jumpTo + what`，而 `what` 是 `attentionSummary(full)` 折叠后的 160 字（`attention.ts:197-202`）：
   ```ts
   const seen = new Set(waiting.map(item => `${item.kind}\u0000${item.jumpTo}\u0000${item.what}`))
   ```
   两条不同审批只要摘要相同就互相吞掉；长理由共享前 160 字时也会碰撞。`AttentionItem` 没有携带审批 id，去重只能靠内容。
3. 活体映射丢 `detail`（`attention.ts:188-194`）：
   ```ts
   const waiting: AttentionItem[] = live.map(entry => ({
     kind: entry.kind, who: entry.sessionId, what: entry.what, time: entry.since, jumpTo: entry.sessionId,
   }))
   ```
   而 `LivePending` 明确有 `detail?: string`（`attention.ts:37-42`），观察者也写了（`attention-observers.ts:56-61`）；`AttentionTab` 用 `item.detail ?? item.what` 做 `title`（`AttentionTab.tsx:188`）。于是活体条目的悬停全文丢失，刷新后才恢复。
4. 单测 gap：`tests/client/presence/attention-history.spec.ts` 覆盖了 asked/decided 配对、缺 toolName、单会话失败等，但没有「同一会话两条同摘要审批」和「live detail 透传」两条。

## 失败类与同类排查

**失败类 = 去重键选了摘要而非稳定身份**。同类：

- 待办列表的 React key 也用 `time-kind-jumpTo-what`（`AttentionTab.tsx:75`）；即使 merge 不吞，两条同摘要也会 key 冲突；
- `mergeAttention` 同样吞两条同摘要的 completion/escalation（`what` 相同 + `jumpTo` 相同）；
- 不同会话的同摘要审批不会互吞（`jumpTo` 不同），所以现场只在「同一会话多审批」出现；
- 不是 vendor 事件面问题：`approval/asked` 自带 id，读模型自己丢了。

## 修复方案与范围

- **根因修法**：给 `AttentionItem` / `LivePending` 补稳定身份（审批 id / 问询 id；没有 id 的消息类用 messageId 或 `time+seq`），`mergeAttention` 的 live/history 去重按 **id + kind + jumpTo**，不按摘要；列表 key 同步用 id。
- `live.map` 透传 `detail`（以及 id），`AttentionTab` 的 `title` 保留全文。
- **判据补强**：`mergeAttention` 两条同摘要不同 id → 2 条；同一条 live+history（同 id）→ 1 条；live 条目的 `detail` 在 merge 后仍在；列表 key 不碰撞。
- **不改**：摘要折叠本身（BUG-295 的成果）；`attentionSummary` 的 160 字上限；跨会话候选筛选。
- **材料性**：client 待办呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 两条同摘要、不同 id 的挂起审批在待办显示为两条（或明确说明合并规则），不会无声少一条；
- 同一条 live+history 仍只显示一条（按 id 去重）；
- 活体条目的 `detail` 在 merge 后保留，悬停/详情能看到完整理由；
- 上述三条在 `mergeAttention` 的 keyless spec 里各有断言。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/attention.ts`、`packages/company-pack/src/client/wiring/attention-observers.ts`、`packages/company-pack/src/client/tabs/AttentionTab.tsx`、`tests/client/wiring/attention.spec.ts`、`tests/client/wiring/attention-observers.spec.ts`
- 红：`vitest run tests/client/wiring/attention.spec.ts` —— 去掉 `attentionItemKey` 改回摘要键后，「两条同摘要不同 id ⇒ 2 条」断言得到 1 条；同窗口活体条目 `detail` 丢失（`title` 退回摘要）
- 绿：`vitest run tests/client/wiring/attention.spec.ts` —— 27/27（同摘要不同 id ⇒ 2、同 id live+history ⇒ 1、live detail 保留、key 不撞）；`vitest run tests/client/wiring/attention-observers.spec.ts` —— 9/9（带 id / 缺 id 两条）
- 提交：commit f996ac03
