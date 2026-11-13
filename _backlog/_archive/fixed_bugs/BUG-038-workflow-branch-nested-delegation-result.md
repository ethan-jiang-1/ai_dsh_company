---
status: 已修
severity: P2
opened: 2026-11-08
---

# BUG-038：workflow 分支内再委派时，分支返回值把回执和结论拼在一起（schema 分支会 null）

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：已修（2026-11-08）｜审查：agent — 判定第一条走“本仓明确禁止 + 真实会话观察”分支：一次真跑首轮嵌套后模型自行读到混合回执、并重构为父层扇出；同轮修正了 skill 里“一定会 null”的过度断言。观察为单次，未重复多跑

## 症状

R5 强制“W 分支内起 subagent”试验：两个分支各自收到“用 `subagent` 起孙代、等孙代完成通知、把版本号
作为分支最终结果返回”的任务书。结果：

- 两个分支都真的起了孙代（depth 2），孙代读到了版本；
- 分支自己的会话有 **两轮**：第一轮只拿到 `started subagent <id>` 回执并 `turn/end`，孙代完成通知开
  第二轮，第二轮才拿到版本；
- `agent()` 返回的分支结果是两轮 assistant 文本的拼接，形如
  `RECEIPT_ONLY: started subagent 07b29fca-… 0.9.0 0.9.0`，不是干净的值；
- 父 workflow 只能靠人工/模型解析这段文本；模型明确说“值对，但分支是否真的等通知、是否偷读文件，
  从返回值层面无法区分”。

若分支声明了 `schema`：分支的最终输出是**文本**而不是结构化对象，`agent()` 会在
“completed 但缺 structured”分支返回 `null`（`runtime.ts` 的 schema 分支），父代理会把一个其实
成功取到值的分支当成失败。

## 根因（假设）

`subagent` 是 activation：分支的第一轮在 ack 后就结束；孙代完成通知会开第二轮（workflow 的 child
result 等待的是整个 child run，跨轮拼接），但 workflow 的 `agent()` 只取最终拼接文本，不区分
“回执轮”与“结论轮”。`delivery:'caller'` 不把子消息送进父会话，父拿到的就是这段混合文本。

## 暴露的失败类

- 嵌套委派的结果形状不可判：父代理无法从返回值区分“分支自己读的”“孙代回的”“只拿到回执”。
- 带 schema 的嵌套分支会 null，且 null 与真正失败无法区分；按本卡 BUG-036 的 retry 规则会被误判
  为可重试失败。
- 这正是“workflow 子代能再开 subagent”这条深度矩阵在实践中不成立的地方：能力在，结果传递不成形。

## 复现

1. vp-eng 根会话（R5 prompt）：workflow 2 分支，每支要求“用 subagent 起孙代读 fixtures/{a,b} 的
   version，等通知后把版本作为分支最终结果”。
2. 观察 `tool-workflow/run-end completed`、2 agents；读两个分支会话：各 2 个 `turn/start`，
   第一轮只有 `subagent` 调用 + `turn/end`，第二轮才出现版本；分支最终文本含
   `started subagent … <value> <value>`。
3. 证据：`runtime/tmp/explore/ex1/R5/summary.json`；父会话
   `session-54ec7d90-cdc9-4129-8995-2cfe0d7a73c3`；分支 `25bc0c06-…` / `c86e9bff-…`。

## 发现路径（探索方向）

“深度 / 嵌套委派”charter（R5）：不是单纯验 depth 拒绝，而是让**中间层真的把孙代结果带回来**。
**探索方向提示**：凡是“父等子、子等孙”的链路，除了看 depth 数值，还要读中间层会话的
`turn/start|turn/end` 配对与最终返回值形状——能力可达 ≠ 结果可传。

## 修复关联

- 已在 `eng-teaming` 加“分支默认是叶子”：分支里再委派只在确需两层时用，且要规定只回一行可解析值；
  确需两层就让父 workflow 直接起第二层。
- **真跑观察（2026-11-08）**：`session-03fe693d-…`（`runtime/tmp/explore/fix1/S038/`）3 次 workflow / 8 agents。
  首轮把 `subagent` 放进分支，模型自己读到 `started subagent … <值>` 的混合返回，随后重构为父层直接扇出，
  最终返回干净对象并写明理由；同轮**如实修正**了 skill 的“嵌套 schema 分支一定 null”——3 次复现都没 null，
  null 来自 child 没调 `structured_output`（BUG-040），不是嵌套本身。skill 已改成“回执/自述会混入；
  schema 只约束形状，不保证干净值”。
- **机制钉子**：`checks/lanes/workflow-contract.e2e.mjs` 第 6 条——非 schema 分支的返回值就是 child
  最终文本原样拼接（回执与结论不区分），钉住“为什么分支要当叶子”。
- 未做机制修复（vendor `runtime.ts` 的分支结果语义不改）；上游提案 = 分支结果只取最后一轮结论/或把
  activation 回执与结论分开（与 BUG-040 同批；[收口 Note](../../../notes/implemented/2026-11-08-delegation-contract-repair.md) §上游批）。

## 已修判定

- 工作流分支的返回值要么只含结论（结构化或单行值），要么本仓明确禁止分支内嵌套委派并在真实会话
  中稳定观察到模型遵守；且
- 带 schema 的嵌套分支不再以“成功取到值却返回 null”的方式失败（或该失败在文档/技能里被点名）。
