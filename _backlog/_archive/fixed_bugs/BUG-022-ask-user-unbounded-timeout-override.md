---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-022：模型可单次调用把问询窗口要回无界（`timeout: -1`）——无人值守驱动仍会静默停住

> 立卡：2026-10-18 ｜ 状态：已修 ｜ 关系 = **BUG-021 的残留**（已修卡不重开，新卡引用旧卡）
> 严重级别：P2（不损坏数据；但「驱动跑到问询就停住、没人知道」的原始危害在 `-1` 这条路上**仍然成立**）｜发现：2026-10-18 真模型验收轮 ｜ 状态：修复就绪
>
> **授权（2026-10-18）**：修法 A 只动本仓工具/探针/文档面（**不改 vendor、不动 pack 公开行为**），属 P2 修复型；
> 用户令「继续推进…按流程修…尽量把应该做完的都做完」= 实施指示。

## 现场（真模型三次实跑，同日，ceo 会话 · 排练盘）

| # | 模型单次给的 `timeout` | 结果 |
|---|---|---|
| 1 | 未传（用 preset 默认 120） | `tool/result` 在 **+120.0s** 到达且含 `pending` → `turn/end` → `userQuestions/answer` 返回 **true** → 答案以新消息回会话 ✅ |
| 2 | 顶层 `180` | `tool/result` 在 **+180.0s** 到达且含 `pending` ✅（探针当时宽容 180s，差 12ms 判红，已改自适应） |
| 3 | 顶层 `-1` | **无 `pending`、无 `turn/end`**、`userQuestions/answer` 返回 **false** ⇒ 驱动永久停住（= BUG-021 的原始症状） |

会话：`session-2c63dcd0…`（#1）、`session-c20eae72…`（#2）、`session-bb5eb0d6…`（#3）；探针 =
`probes/session-context/ask-user-timed-probe.mjs`。

## 为什么这不是「BUG-021 修复失效」

- vendor schema **有意**允许 `-1`，工具描述原文：*"Use -1 only when an answer is required before proceeding."*
  ⇒ 模型传 `-1` 是**合规判断**，不是越权；它表达的是「我必须先知道答案」。
- BUG-021 修掉的是「**默认**无界」（preset 钉 120，实证 #1/#2 都按窗口收口）。`-1` 是另一个问题：
  **这种"必须等人"的停点，怎么让驱动**机器可读地**停下来**——而不是干等 40 分钟把会话等死（BUG-021 的原始危害）。

## 候选修法（待裁）

- **A（推荐）驱动侧守则 + 机器可读停点**：驱动在等待期间轮询问询投影（`user-questions` 有 `open`/`continued` 态），
  一旦看到 `open` 且既无 `continued` 也无 `pending` ⇒ **立即停并报「需人参与」**（谁、哪个 callId、哪个 question），
  不再干等到会话掉线。落点 = 纯逻辑进 `tools/lib`（keyless 可测）+ 驱动探针使用 + 手册一行。
- **B** persona 一行「不要传 `-1`，用显式窗口」：软守卫（模型可忽略），且与 vendor 那句"必须等到答案"的语义相抵。
- **C** 提上游：`-1`（或长窗口）是否该有"驱动可认领/可解"的形态（`attachWait` 目前是 Client 侧流，驱动可否认领未查）。
- **D** 只写进手册（最低成本，危害仍在）。

## 复现

```sh
# 无界路径：把探针 prompt 里的「显式传 timeout: 30」改成「传 -1」后重跑
source run/env.sh && node probes/session-context/ask-user-timed-probe.mjs
```

## 已修判定

- [x] 纯逻辑 `questionStopOf(events, options)` 落 `tools/lib/question-stop.mjs`：三类结论（无停点 / 有界等待含 `remainingMs` /
      无界卡死含理由）+ 逾期分支；**红**（模块缺失，spec import 即红）→ **绿 10/10**。
- [x] 判定只用**会话日志可观测面**（`tool/call name=ask_user_question` 与 `data.message.toolCallId` 配对），
      坏 `arguments` / 缺时间戳 / 别的工具挂住都有 spec 兜底。
- [x] 真模型证据：探针 `--unbounded` 档（让模型传 `-1`）⇒ 判定 **0s** 给出「需人参与」+ 坐标
      （`callId=call_00_cuinHWFLhQW5yBKkcWxY1848`、`question.id=three-way-choice`），现场复核确认会话确实停住（无 `turn/end`、无 `tool/result`）；
      对照：默认档仍判「有界等待」并等到 `pending` → 收口 → RPC 可答 → 答案回会话（ALL PASS）。
- [x] 文档面：毕业 Note 持完整用法；`docs/guides/web-rpc.md` 那条既有 bullet 内追加指针（不新增行——该文件 47/47 顶格）。
- [x] 收尾：本卡归档 `fixed_bugs` + 两边索引；BUG-021 卡/Note 的残留指针回填为「已修 + Note 链接」；
      `pnpm test`（628）与 `pnpm verify` 全绿。

## 关闭条件

- 用户裁定 A/B/C/D；选了 A 或 B/C 中可落地的一项并落地（A 的判据 = keyless 纯逻辑 spec + 一次真跑证明"看到 open 就停并报"）
  ⇒ `已修` 归档，去向写进 BUG-021 的毕业 Note 或新 Note。
