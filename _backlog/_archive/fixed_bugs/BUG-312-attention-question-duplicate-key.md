---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-312：两条同文问询共用同一个 React key——question 活体没有稳定 id，`attentionItemKey` 退化成摘要

> 严重级别：P2（次要：同会话两条相同问询会撞 key；React 会警告并可能复用/丢行，用户可能只看到一条）｜发现：2026-11-22（E2E 第四轮）｜状态：已修｜审查：agent — 逐条核对已修判定（同文两条 id 不同 + 消息类按时间 + 有 id 按 id）
>
> **留痕**：commit 0025679b（client 身份键，材料性；批次 Note 覆盖）。

## 症状

同一会话里同时挂起两条 `user-questions/request`，文本相同（模型重试/重复提问）：

- 观察者登记两条 `LivePending`，但 `question` 分支**没有 id**；
- `mergeAttention` 返回两条；
- `attentionItemKey` 对两条返回同一个字符串（`kind + jumpTo + what`）；
- `AttentionTab` 用它作 `<li key>`（`AttentionTab.tsx:189/213`）→ React duplicate key 警告；React 可能复用/丢行，面板不能可靠显示两条。

纯函数：

```sh
node --import tsx/esm -e "
import { attentionItemKey } from './packages/company-pack/src/lib/presence/attention.ts'
const a = { kind:'question', who:'s1', what:'same question', time:1, jumpTo:'s1' }
const b = { kind:'question', who:'s1', what:'same question', time:2, jumpTo:'s1' }
console.log(attentionItemKey(a) === attentionItemKey(b), attentionItemKey(a))
"
# true question\0s1\0same question
```

## 运行面

- **面 = client 待办**：`packages/company-pack/src/client/wiring/attention-observers.ts` 的 question 登记；`lib/presence/attention.ts` 的 `attentionItemKey`；`tabs/AttentionTab.tsx` 的 key。
- 数据源 = `user-questions/request`（当前观察者只取 `questions[0].question` 文本）。

## 复现

1. 起实例，让同一会话连续发起两个文本相同的 `ask_user_question`（或直接 mock 两条 `LivePending`）。
2. 打开「待办」。
3. 期望：两行分别可处理；实际：两条 `itemKey` 相同（React warning，渲染可能少一行）。

## 根因与证据

1. `AttentionItem`/`LivePending` 的 `id` 是可选；`attentionItemKey` 无 id 时退回摘要（`attention.ts:206-210` 附近）：
   ```ts
   return item.id === undefined
     ? `${item.kind}\0${item.jumpTo}\0${item.what}`
     : `${item.kind}\0${item.jumpTo}\0#${item.id}`
   ```
2. `attention-observers.ts:38-48` 的 question 分支只读 `questions[0].question`，没有读 request/question 的 id：
   ```ts
   const done = attention.begin({ kind:'question', sessionId, what: attentionSummary(...), ... })
   ```
   approval 分支有 `approval.id`，question 没有。
3. `AttentionTab` 直接用 `attentionItemKey` 作 key（`AttentionTab.tsx:76-78`, `:189`, `:213`）。
4. `mergeAttention` 不会对 live 内部去重，所以两条都进列表；但 key 相同。

## 失败类与同类排查

**失败类 = 稳定身份缺失（同 BUG-299，但只修了 approval）**。同类：

- approval 已有 id；question 没有；escalation/completion 也没有，但它们是「告知」类、同文重复较少，仍可能撞 key。
- `question` 的 live 条目没有历史重建，因此没有 history id 可用；需要从 request 里取 id，或客户端生成 occurrence id（`time + seq`）。
- 不是「同一条 live+history 去重」问题；本卡是两条不同问询被当成同一身份。

## 修复方案与范围

- **根因修法**：question 分支从请求里取 id（若有）填 `id`；没有则用 `time + 一个本地自增序号` 生成 occurrence id（但要保证同一条 live 在其生命周期内稳定）；`attentionItemKey` 有 id 时用 id。
- 或者给 `AttentionItem` 增加 `key` 字段，由登记处分配唯一值；列表 key 与去重键分开。
- **判据**：两条同文 question → 两个不同 key、两行；同一条 question 的 live 重复登记（如有）→ 同 key；approval 行为不回归。
- **不改**：approval id 去重；`mergeAttention` 对 live/history 的语义。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 两条同文 question 在待办显示两行，React console 无 duplicate-key 警告；
- 单条 question 不重复；
- approval 的两条同摘要仍按 id 分开（BUG-299 不回归）；
- keyless merge/key spec + 真页面两条相同问询各一条。

## 修复证据

- 改动面：`packages/company-pack/src/client/wiring/attention-observers.ts`（问询登记合成 id）、`packages/company-pack/src/lib/presence/attention.ts`（`attentionItemKey` 无 id 分支改按时间）、`tests/client/wiring/{attention,attention-observers}.spec.ts`
- 红：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts` —— 去掉合成 id 且把 key 改回按 `what` 后 2 failed（同文两条问询 key 相同、id 缺失）
- 绿：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts` —— 79/79（同文两条 id 不同；同文消息类时间不同 ⇒ key 不同；有 id 按 id 区分）
- 提交：commit 0025679b
