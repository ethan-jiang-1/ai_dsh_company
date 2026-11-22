---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-331：一次 `ask_user_question` 带多个问题，待办只显示第一个——没有「共 N 个问题」

> 严重级别：P2（次要：多问题请求是工具合同支持的形状；列表只取 `questions[0]`，用户可能只答第一题就离开，第二题仍在等）｜发现：2026-11-23（E2E 第六轮）｜状态：已修｜审查：agent — 逐条核对已修判定（跨源/源内、多问题、恰好一页与 +1）
>
> **留痕**：commit 0b3b6428（与 325/331/332 同批：问询读模型，材料性；批次 Note 覆盖）。

## 症状

`ask_user_question` 一次请求可以带多个问题（`questions: [{question:'A'},{question:'B'},…]`）。待办条目：

- `what`/`detail` 只取第一个问题；
- 没有「还有 2 个问题」/「共 3 个问题」；
- 用户从待办点「去处理」能看到官方 UI 的全部问题；但只看列表会以为只有一个。

活体观察者与历史重建两处都只读 `questions[0]`。

## 运行面

- **面 = client 待办 + 观察者**：`attention-observers.ts` 的 `questions[0]`；`lib/presence/attention.ts` 的 `questionTextOf` 也只读 `questions[0]`；`pendingQuestions` 一个 tool/call 生成一条 item。
- 数据面 = `ask_user_question` 的 `arguments.questions`。

## 复现

1. 造一个未答 tool/call：`arguments={"questions":[{"question":"A?"},{"question":"B?"}]}`。
2. 用 `pendingQuestions`/观察者登记，打开「待办」。
3. 期望：条目说明「A?（共 2 个问题）」；实际：只有 `A?`。

纯证据：

```sh
node --import tsx/esm -e "
import { pendingQuestions } from './packages/company-pack/src/lib/presence/attention.ts'
const events=[{type:'tool/call',time:1,data:{callId:'c',name:'ask_user_question',arguments:JSON.stringify({questions:[{question:'A?'},{question:'B?'}]})}}]
const q=pendingQuestions(events,'s')[0]
console.log(q.what, q.detail)
"
# A? A?
```

## 根因与证据

- `attention.ts` 的 `questionTextOf`：`const first = parsed.questions?.[0]?.question`；只读第一个。
- `attention-observers.ts` 同款 `questions[0]`；live item 也只有一个。
- `pendingQuestions` 一个 callId 一条 item，没有 `questionCount`/`remaining` 字段；`AttentionItem` 只有 `what/detail`。
- 官方 UI 能显示全部，但待办列表不提示数量。

## 失败类与同类排查

**失败类 = 一条请求含多个子问题，摘要层只取第一个且不报数量**。同类：

- 单问题请求：正常。
- 多问题：本卡。
- 审批没有子项。
- 不是「只显示摘要」：摘要可以只显示第一个，但必须说「共 N 个 / 还有 N 个」，否则用户无法知道还要答。

## 修复方案与范围

- **根因修法**：`questionTextOf` 返回 `{ first, count }`；`AttentionItem` 增加 `count`/`remaining`（或 `what` 追加「（共 N 个问题）」）；live 与 history 同源。
- 或一个 tool/call 拆成 N 条 item（但同一 callId 的答案一起落，拆分要共享身份，风险更高；优先摘要计数）。
- **判据**：1 个问题 → 无额外后缀；2/3 个 → 显示总数；答完整个 call 后消失；zh/en 同步。
- **不改**：官方 UI 的多问题展示；单条 item 的 callId 身份。
- **材料性**：client 注意力面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 多问题请求在待办明确显示问题总数；
- 单问题不出现冗余后缀；
- 答完全部后条目消失；
- 纯函数 spec + 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/attention.ts`（`questionListOf` / `questionCopy`）、`packages/company-pack/src/client/wiring/attention-observers.ts`、`tests/client/wiring/attention-observers.spec.ts`
- 红：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts tests/client/presence/attention-history.spec.ts` —— 只读第一个问题后「三个问题 ⇒ 共 3 个问题 / detail 含 B、C」失败
- 绿：`vitest run tests/client/wiring/attention.spec.ts tests/client/wiring/attention-observers.spec.ts tests/client/presence/attention-history.spec.ts` —— 47/47 + 12/12 + 17/17
- 提交：commit 0b3b6428
