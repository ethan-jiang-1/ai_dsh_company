# BUG-022 已修：驱动侧问询停点判定（看到"无界"就停并报）

状态：已交付（2026-10-18；授权 = 用户令「继续推进…按流程修…尽量把应该做完的都做完了」——修法 A 只动本仓工具/探针/文档面）

> 现场（真模型三次实跑）、候选修法与裁定 = [BUG-022 卡（已归档）](../../_backlog/_archive/fixed_bugs/BUG-022-ask-user-unbounded-timeout-override.md)；
> 前决定（timed 形态） = [BUG-021 Note](./2026-10-18-bug021-timed-user-question.md)。本 Note = 决定 + 证据 + 驱动用法 + 残留。

## 决定

**采 A：驱动侧停点守则 + 机器可读判定。** 模型可以单次传 `timeout: -1`（vendor schema 有意允许：
*"Use -1 only when an answer is required before proceeding"*），窗口因此回到无界——**这是合规判断，不是越权**，
所以修法不跟模型较劲，而是让**驱动**在停点上做出正确动作：**立刻停并报"需人参与"**，而不是陪着干等到会话掉线
（BUG-021 现场就是这么丢掉一场跑到 26 步的动议的）。

- **判定只看会话日志可观测面**（驱动手里只有日志）：`tool/call`（`name = ask_user_question`）与配对
  `tool/result`（实测配对键 = `data.message.toolCallId`）。三类结论 + 逾期分支：
  `null`（没停在问询上）/ **有界等待**（含 `remainingMs`，驱动继续等窗口）/ **无界卡死**（`timeout: -1`，或超长窗视同无界）/
  **逾期**（窗口 + 宽限已过仍无结果 ⇒ 也停，报"工具没按窗口收口，需人查现场"）。
- **不改 vendor、不动 pack 公开行为**：落点 = `tools/lib/question-stop.mjs`（纯逻辑）+ keyless spec + 真模型探针 + 一处文档指针。
- **不做**：B（persona 禁 `-1`——软守卫且与 vendor 语义相抵）；C（提上游，另议）；D（只写手册，危害仍在）。

## 驱动用法

```js
import { questionStopOf } from '<repo>/tools/lib/question-stop.mjs'
// 轮询驱动的主循环里：拿会话事件（session/page 或日志），判定一次
const verdict = questionStopOf(events, { now: Date.now() })
if (verdict?.action === 'stop') {
  // 停：把坐标与理由报给人，别再等（等下去只会等到会话掉线）
  throw new Error(`需人参与：${verdict.reason}｜callId=${verdict.callId}｜question.id=${verdict.questionIds.join(', ')}`)
}
// verdict?.action === 'wait' ⇒ 窗口还在走（verdict.remainingMs），继续干活/继续等
```

## 实跑证据（红 → 绿）

| 检查 | 结果 |
|---|---|
| **红**：`pnpm exec vitest run tests/harness/question-stop.spec.ts` | 模块缺失，spec import 即红（判据先行） |
| 绿：同上 | **10/10 PASS**（无停点 / 已配对不算停点 / 默认窗口剩余 / `-1` 无界 / 超长窗 / 逾期 / 多条取最老 / question.id 带出 / 坏形状不炸 / 别的工具挂住不算） |
| **真模型（BUG-022 档）**：`node probes/session-context/ask-user-timed-probe.mjs --unbounded` | **ALL PASS**：模型传 `-1` ⇒ 判定 **0s** 给出「需人参与」+ 坐标（`callId=call_00_cuinHWFLhQW5yBKkcWxY1848`、`question.id=three-way-choice`）；现场复核 = 会话确实停住（无 `turn/end`、无 `tool/result`） |
| **真模型（回归档，不许被本改动带坏）**：同脚本默认档 | **ALL PASS**：判「有界等待」→ 窗口到点 `pending` → `turn/end` → `userQuestions/answer` true → 答案回会话 |
| 全量 keyless：`pnpm test` | **628 tests PASS** |
| 结构：`pnpm verify` | ALL PASS |
| 文档预算 | `docs/guides/web-rpc.md` 仍 **47/47**（指针追加在既有 bullet 内，未新增行） |

## 未验残留（显式）

- **形状漂移已加固为 fail-loud**（2026-10-18 二轮）：`name` 命中却缺 `callId`、`arguments` 不是 JSON 对象、
  或"只靠参数里的 `questions` 才认出问询"（工具改名/字段搬家）三种情形，判定一律给
  `window: 'unknown'` + `action: 'stop'` 并**点名形状**，不再静默判"无停点"（静默 = 驱动继续干等 = 原始危害复现）；
  spec 从 10 例扩到 **13 例**（新增三例，另把"坏 arguments 按默认窗口陪等"的旧行为改判为 fail-loud）。
  **剩余边界**：完全不认识的新形状（既不叫 `ask_user_question`、参数里也没有 `questions`）仍会判"无停点"——
  那种形变只能靠人/新的形状识别补，本档不假装覆盖。
- **守则的使用者目前只有本仓探针**：外部/临时驱动脚本要自己 `import` 该纯逻辑（文档指针在 `web-rpc.md` 与上「驱动用法」节）。
- 窗口秒数的**体验调参**仍未做（preset 钉 120s；`-1`/超长窗由模型按需覆盖）——需要真人体验一轮再定。

## 指针

- 卡（三次真跑时序、候选 A/B/C/D）：[BUG-022（已归档）](../../_backlog/_archive/fixed_bugs/BUG-022-ask-user-unbounded-timeout-override.md)
- 判定实现：[question-stop.mjs](../../tools/lib/question-stop.mjs)｜判据：[question-stop.spec.ts](../../tests/harness/question-stop.spec.ts)｜真模型两档：[ask-user-timed-probe.mjs](../../probes/session-context/ask-user-timed-probe.mjs)
- 文档面：[web-rpc.md](../../docs/guides/web-rpc.md)｜前决定：[BUG-021 Note](./2026-10-18-bug021-timed-user-question.md)
