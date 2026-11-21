---
status: 调查中
severity: P2
opened: 2026-11-21
---

# BUG-295：待办把整段审批理由塞进「一句话摘要」——一条挂起项占满整个面板

> 严重级别：P2（次要偏重：待办面板的核心用途是「一屏看清等你的事」，一条超长理由会让其余条目与「刚完成」全部沉到滚动里）｜发现：2026-11-21（E2E 设计轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-21 指令「发现问题直接报 bug，别急着修」）。

## 症状

真实 CFO 会话触发 `request_signoff` 后，在另一个 CEO 会话打开右栏「待办」：

- 「等你处理」只有一条「待批审批」，但它把审批理由（模型写的多段 Markdown、含数字复算、选项 A/B/C）整段渲染进列表行；
- 390px 宽的面板里这一条约占 20+ 行，把「刚完成」推到首屏之外；再挂一条同类审批时，列表基本不可读；
- 官方审批卡（「去处理」跳过去后的那张）也需要滚动，但那是**详情**，可以接受；列表行是**摘要**，不应承担全文。

证据（原型 E2E 轮，gitignored）：`runtime/tmp/e2e-evidence/2026-11-21T15-21-04/03-cross-session-attention.png`（列表行占满面板）；`.../15-54-10/03-cross-session-attention-live.png`（同类）。

## 运行面

- **面 = client + lib 读模型**：`packages/company-pack/src/lib/presence/attention.ts` 的 `pendingApprovals`；`packages/company-pack/src/client/wiring/attention-observers.ts` 的活体登记；`packages/company-pack/src/client/tabs/AttentionTab.tsx` 的列表渲染。
- 数据源 = 会话日志的 `approval/asked.reason`（模型生成，长度无上界）。

## 复现

1. 隔离公司实例（`DSH_PERMISSION_MODE=workspace-write`，审批策略 `ask`）。
2. 建 CFO 会话，发触线 prompt（例如 `attention-e2e` 的 8.2 折双签 prompt），等 `approval/asked`。
3. 在另一个 CEO 会话打开右栏「待办」。

期望：列表行是一句可扫的摘要（可展开/悬停看全文）；实际：整段 `reason` 直接进 `what`，列表行高度随模型输出无限增长。

## 根因与证据

`AttentionItem.what` 的类型注释是「一句话摘要」（`attention.ts:25`），但两处构造都把完整 `reason` 拼进去：

- `attention.ts:145`（历史重建）：`what: reason === '' ? toolName : `${toolName}：${reason}``
- `attention-observers.ts:57`（活体登记）：同一拼接

`AttentionTab` 列表直接渲染 `{item.what}`，没有截断/展开面：

```tsx
{' '}{whoOf(item)}：{item.what}
```

所以只要 `reason` 长，列表行就长。`reason` 由模型写，可能包含多段、列表、复算数字；本轮的现场输出约 1.5–2 KB。

对照：台账页签已经用 `LedgerSummary` 解决过同一类问题（2 行钳制 + 全文入口），待办没有复用这个模式。

## 失败类与同类排查

**失败类 = 外部长文本越过「摘要」边界**（视图模型把详情字段当摘要字段）。同类扫描：

- `question` 的 `what` 同样直接取 `question` 全文（`attention-observers.ts:45`），也可能很长；
- `escalation` 的 `what` 取消息全文（`attention.ts:104`），同样无上界；
- `completion` 的 `what` 取 `present` 的 `title/slug/path`（通常短），风险低。
- 台账的 `LedgerSummary` 是现成的处理范式（钳制 + 全文入口），可参照。

## 修复方案与范围

- **根因修法**：在 `AttentionItem` 上区分 `summary`（列表用，限 N 字符/行）与 `detail`（完整 `reason`，详情/审批卡用），或至少在 `pendingApprovals`/观察者构造时截断 `what`（例如 160 字符）并保留完整字段供 tooltip/展开。
- **判据补强**：一条 2 KB `reason` 的 fixture，断言列表行文本长度 ≤ 上限；多条挂起时「刚完成」仍在首屏附近；完整文本仍可在详情/展开面读到（不静默丢）。
- **不改**：官方审批卡（详情面）的全文展示、跨会话聚合逻辑、`mergeAttention` 去重键（去重键依赖 `what`，截断要保证同一条审批的 live/history 截断结果一致，否则会重复；这是修法必须一起处理的点）。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 长 `reason` 的挂起审批在待办列表里占固定上限（行数/字符数），不再随理由长度膨胀；
- 同一条审批的活体与历史重建仍去重为一条（截断规则同源）；
- 完整理由仍能从「去处理」的官方审批卡或展开面读到；zh/en 两态。
