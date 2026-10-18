---
status: 调查中
severity: P2
opened: 2026-10-18
---

# BUG-022：模型可单次调用把问询窗口要回无界（`timeout: -1`）——无人值守驱动仍会静默停住

> 立卡：2026-10-18 ｜ 状态：调查中 ｜ 关系 = **BUG-021 的残留**（已修卡不重开，新卡引用旧卡）
> 严重级别：P2（不损坏数据；但「驱动跑到问询就停住、没人知道」的原始危害在 `-1` 这条路上**仍然成立**）｜发现：2026-10-18 真模型验收轮

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

## 关闭条件

- 用户裁定 A/B/C/D；选了 A 或 B/C 中可落地的一项并落地（A 的判据 = keyless 纯逻辑 spec + 一次真跑证明"看到 open 就停并报"）
  ⇒ `已修` 归档，去向写进 BUG-021 的毕业 Note 或新 Note。
