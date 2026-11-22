---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-325：同一条挂起问询在刷新后出现两次——活体 id `question:<ms>:<seq>` 与历史 id `callId` 对不上

> 严重级别：P2（次要偏重：319 补了问询历史重建，但活体与历史用两套身份；刷新/重开后同一条问询可能重叠出现）｜发现：2026-11-23（E2E 第六轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-23 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

同一条未答 `ask_user_question`：

- 活体观察者登记为 `id = question:<Date.now>:<seq>`（BUG-312 的合成身份）；
- 历史重建 `pendingQuestions` 登记为 `id = data.callId`（BUG-319 的日志口径）；
- `mergeAttention(live, history)` 只按 `attentionItemKey` 去重；两套 id 不同 → 两条同文问询，React 两个 key，待办显示两行。

页面刷新时，活体可能尚未登记，历史先出现；之后 `user-questions/request` 重放/观察者再登记，就会出现两行。或同一页面先 live 后历史重读，也会重叠。

纯证据：

```sh
node --import tsx/esm -e "
import { pendingQuestions, mergeAttention } from './packages/company-pack/src/lib/presence/attention.ts'
const events = [{ type:'tool/call', time:1, data:{ callId:'call-1', name:'ask_user_question', arguments: JSON.stringify({questions:[{question:'same?'}]}) } }]
const hist = pendingQuestions(events, 's')
const live = [{ kind:'question', sessionId:'s', id:'question:1:1', what:'same?', since:1 }]
console.log(hist[0].id, mergeAttention(live, hist).length)
"
# call-1 2
```

## 运行面

- **面 = client 待办**：`attention-observers.ts` 的 live question `id`；`attention.ts` 的 `pendingQuestions` / `mergeAttention`；`AttentionTab` 的 `live` + `history.items`。
- 数据面 = `user-questions/request`（live）与 `ask_user_question` 的 `tool/call`（history）。

## 复现

1. 造一条未答问询（tool/call callId=call-1）。
2. 用 `pendingQuestions` 得到 history item（id=call-1）。
3. 用观察者同款 live item（id=question:…）喂 `mergeAttention`。
4. 期望：1 条；实际：2 条。

## 根因与证据

- `attention-observers.ts:38-50`：live question 合成 id `question:${Date.now()}:${seq}`（312）。
- `attention.ts` 的 `pendingQuestions`（319）：`id: data.callId`。
- `attentionItemKey`（`:235-240`）有 id 就按 id；两套 id 永远不相等。
- `mergeAttention` 只按 key 去重；没有「同 session + 同 what + 时间接近」的兜底（也不该有——同文两条问询必须能分开，312 的教训）。
- 这是 312 与 319 两次修复的**身份合同不一致**。

## 失败类与同类排查

**失败类 = 同一实体的两个来源各自生成身份**。同类：

- approval：live 与 history 都用平台 `approval.id`，不重复。
- question：live 合成、history callId（本卡）。
- 312 解决的是「同文两条 live 问询不能撞 key」；本卡是「同一条 live/history 不能各算一条」。
- 不能简单回落到摘要/时间：会重新引入 312 的同文合并。

## 修复方案与范围

- **根因修法**：live 与 history 必须用同一身份。优先让 live observer 从 request 里取平台 id/callId；取不到时，history 侧也用与 live 同源的合成规则（例如按 session + 时间 + 序号），并让两处共享一个 `questionIdentity` helper。
- 另一种：`mergeAttention` 增加显式的 `sourceKey` 字段（平台 id/callId）用于跨源去重，UI key 另算；不要把摘要当身份。
- **判据**：同一条 question live+history → 1 条；两条同文不同 question → 2 条（312 不回归）；刷新后不重复；zh/en 同步。
- **不改**：approval id；`attentionItemKey` 的「有 id 按 id」原则。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 同一问询 live/history 只出现一次；
- 同文两条问询仍分开；
- 刷新、重读、后开观察窗三种时序都不重复；
- 纯函数 spec（live+history 1 条）+ 真页面一条。
