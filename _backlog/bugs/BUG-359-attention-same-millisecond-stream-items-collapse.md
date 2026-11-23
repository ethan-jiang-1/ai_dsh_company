---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-359：`mergeAttention` 用「类别 + 会话 + 毫秒时间」当无 id 条目的身份，同一毫秒的两条升级/完成会互相吞掉

> 严重级别：P2（静默丢条目：升级（`ESCALATION_MARK` 消息）与交付完成（`present` 调用）在事件流里**没有稳定 id**，去重键退化成 `time`（毫秒）——同一毫秒产生的两条不同条目会在 `mergeAttention` 里被判成同一条，面板少一行；`AttentionTab` 又用同一个键做 React key，重复键还会让列表行错位）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决）

## 症状

同一 lead 会话在**同一毫秒**产生两条不同的无 id 条目时（例如同一批工具调用里两次 `present`、或一次群发里两条 `[升级]` 消息）：

1. [`streamAttention`](../../packages/company-pack/src/lib/presence/attention.ts#L147-L180) 给两条都写 `time: event.time`（毫秒），且都不带 `id`；
2. [`attentionItemKey`](../../packages/company-pack/src/lib/presence/attention.ts#L306-L317) 对无 id 条目返回 `` `${kind}\0${jumpTo}\0${String(time)}` `` —— 两条键相同；
3. [`mergeAttention`](../../packages/company-pack/src/lib/presence/attention.ts#L268-L292) 在重建段里 `seen.add(key)` 并把已见过的键过滤掉，于是**第二条被丢弃**（本意只是「live ↔ history 同一条去重」）；
4. [`AttentionTab`](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L79-L84) 用同一个键当列表 key，重复键还会让 React 复用/错位行（`BUG-312` 的 React key 面同族）。

## 运行面

- **面 = lib + client**：[`packages/company-pack/src/lib/presence/attention.ts`](../../packages/company-pack/src/lib/presence/attention.ts#L147-L180)（产条目）、[第 268-292 行](../../packages/company-pack/src/lib/presence/attention.ts#L268-L292)（去重）、[第 306-317 行](../../packages/company-pack/src/lib/presence/attention.ts#L306-L317)（身份）、[`AttentionTab.tsx`](../../packages/company-pack/src/client/tabs/AttentionTab.tsx#L79-L84)（key）。

## 复现

```sh
pnpm exec tsx -e "
import { attentionItemKey, mergeAttention } from './packages/company-pack/src/lib/presence/attention.ts';
const a = { kind: 'escalation', who: 'ceo', what: 'first', time: 1700000000000, jumpTo: 'lead' };
const b = { kind: 'escalation', who: 'vp-eng', what: 'second', time: 1700000000000, jumpTo: 'lead' };
console.log(JSON.stringify({ sameKey: attentionItemKey(a) === attentionItemKey(b), merged: mergeAttention([], [a, b]).length }));
"
```

实测输出 `{"sameKey":true,"merged":1}`——两条内容不同的升级只剩一条。（`who` 不同、`what` 不同，唯一相同的是类别、会话与毫秒时间。）

## 根因与证据

1. [`attentionItemKey`](../../packages/company-pack/src/lib/presence/attention.ts#L306-L317) 的注释写明「绝不回落到 `what`」（`BUG-312`：同文两条撞 key），于是无 id 条目只剩下毫秒时间可用——但毫秒**不是**事件身份，同一轮里多条事件共享同一毫秒是常态；
2. `mergeAttention` 的 `seen` 集合同时承担「跨源去重」与「流内去重」两个职责，把流内两条不同条目也当成重复；
3. 事件流里本来有逐事件唯一的 `seq`（`AttentionEventLike` 只声明了 `type/time/data`，见 [第 83 行起](../../packages/company-pack/src/lib/presence/attention.ts#L83-L95)），读模型没有用它。

## 失败类与同类排查

- **失败类**：身份键用可变/低分辨率字段（毫秒时间）代替事件身份（`BUG-312` / `BUG-325` 的同族第三次）。
- **同类排查**：`streamAttention` 的两类条目都受影响；`pendingQuestions` / `pendingApprovals` 有 `callId`/`approval id` 兜底，不受影响，但 `buildQuestionCopy` 无问句时返回的 `'(question missing)'` 条目仍走无 id 路径（无 `id` 的问询一旦同毫秒也会相撞）。

## 修复方案与范围

- **根因修法**：把事件身份带进读模型——`AttentionEventLike` 增加可选 `seq?: number`，`streamAttention` 给条目附 `eventKey: seq`（或用 `seq` 直接生成合成 `id`），`attentionItemKey` 优先用 `eventKey`；`mergeAttention` 只对**跨源**（live vs rebuilt）去重，且仅在双方都缺 `eventKey` 时才退回时间键。

## 已修判定

- 同一毫秒两条内容不同的升级/完成条目在 `mergeAttention` 里都保留（`merged.length === 2`），且 `attentionItemKey` 两者不同；
- 同一事件在 live 与 history 两源出现时仍只显示一条（回归 `BUG-325` 的用例保持绿）；
- `tests/lib/presence/attention*.spec.ts` 增加同毫秒双条目用例，旧实现红、新实现绿。
