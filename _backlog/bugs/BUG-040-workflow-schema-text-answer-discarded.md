---
status: 修复已落地
severity: P2
opened: 2026-11-08
---

# BUG-040：workflow 带 schema 的分支只回文本 → 父代理拿到 null，文本答案被丢弃且无诊断

> 严重级别：P2（次要）｜发现：2026-11-08｜状态：修复已落地｜审查：agent — 技能/验收规则与机制钉子已落地；不把“缓解”写成“已修”

## 症状

R10 后台 workflow 4 分支（m01–m04），父脚本每个 `agent()` 都带 object schema。m01 分支的子代理：

1. `read` 读到了 `fixtures/modules/m01/package.json`；
2. 第二轮**直接回了一段文本** `{"module":"m01","version":"1.0.0","path":"..."}`，没有调用
   `structured_output`；
3. child `turn/end reason=completed`，内容正确、可读。

但父 workflow 看到的是：`agent-end outcome=failed`、`modules[0]=null`、`count:3`；job/run 仍是
`completed`。父代理拿不到任何诊断说明“为什么失败”，也拿不到那段已经被正确写出的文本；只能自己
发现 null 后补跑一次 `subagent` 才拿到 m01=1.0.0。

## 根因（假设）

`workflow-ptc/runtime.ts` 的 schema 分支：`stopReason === 'completed'` 且 `opts.schema !== undefined`
时，若 `result.structured === undefined` 就 `agentEnd(outcome:'failed')` 并返回 `null`。child 的
文本 final text 不在 `WorkflowAgentEndData` 或工具结果里保留，所以父代理看不到“它其实答对了，只是
没用 structured_output”。

## 暴露的失败类

- schema 模式静默丢结果：child 完成且答案正确，但形状不合 schema → 父只看到 null；null 与真正的
  child failure/refusal 无法区分（与 BUG-036/038 的 null 语义叠加）。
- 终态误导：run/job `completed` 不代表分支成功；只看 job 终态会误报“全部齐了”（R10 模型原话）。
- 子代提示面不可见：child 不知道自己“必须调 structured_output”，除非父在分支 prompt 里写死。

## 复现

1. vp-eng 会话，后台 workflow 4 分支各读一个 package.json，父脚本用 object schema
   （`prompt-r10.txt`）。
2. 观察 `tool-workflow/agent-start` m01 → `agent-end outcome=failed`；workflow 返回值
   `modules[0]=null`、`count:3`；`run-end completed`。
3. 读 m01 child 会话（`a1401bf0-…`）：`read` 成功、第二轮 assistant text 是正确 JSON、
   `turn/end completed`；没有 `structured_output` 调用。
4. 证据：`runtime/tmp/explore/ex3/R10/summary.json`；父
   `session-2f4657e5-ecf4-4004-8007-4d2836d4068b`；child `a1401bf0-f191-41e0-a18b-64e2021daca1`。

## 发现路径（探索方向）

“后台 workflow 自然完成 + schema”charter（R10）：不是强制模型写 schema，而是让它自己选“怎么把
分支结果交给父”，其中一条分支自然选了文本。**探索方向提示**：schema 模式要同时看 child 会话的
最终文本和父代理拿到的 null——只看父侧会以为“子代理失败了”，看 child 侧才知道是“形状没对上”。

## 修复关联

- 已在 `eng-teaming` 的 schema 规则加：带 schema 的分支必须在 prompt 里明确“调用 `structured_output`”，
  只回文本会被丢弃成 null；并在“返回聚合/异常”加“run/job completed ≠ 分支成功，验收看 null/count”。
- 绿证据：同一 R10 里 m02/m03/m04 三个分支都调用了 `structured_output`，父均拿到对象；补跑
  `subagent` 也拿到了 m01。
- **机制钉子（2026-11-08）**：`checks/smoke/workflow-contract-smoke.mjs` 第 5 条——fake provider 返回
  `completed` + 纯文本 + schema → `agent()` 返回 null 且 `workflow/agent-end outcome=failed`；
  钉住“父拿裸 null”这一机制事实（不是模型行为）。命令 = `node --import tsx/esm checks/smoke/workflow-contract-smoke.mjs`。
- **上游真 diff（提案，2026-11-08 修正版）**：早先那版只给 `agentEnd` 加 `diagnostic` **不够**——
  父模型看到的是 workflow 的**工具结果文本**，不是 agent-end 事件。要满足判定第一条，诊断必须进工具结果。
  最小改法（三个文件，本仓不编译验证，仅给改动面与验收点）：
  1. `vendor/dsh/packages/workflow/workflow/src/index.ts`：`WorkflowResult` 加
     `diagnostics?: Array<{ label: string; kind: 'shape-mismatch'; finalText: string }>`。
  2. `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts`：schema 分支 `structured === undefined` 时
     收集一条诊断（`label = info.label`、`finalText = outputText(result.output)`），随 `drive()` 结果返回；
     若 guest→host 的结果走显式 schema（`host.ts`/`guest.ts`），同步该字段（当前是 JSON 透传则只加类型）。
  3. `vendor/dsh/packages/workflow/tool-workflow/src/index.ts` 的 `renderResult`（及 `jobOutcomeOf`）：
     在结果文本追加 `Diagnostics: m01 shape-mismatch — final text: …`（按 `maxResultChars` 截断）。
  更小但**改契约**的备选：schema 分支缺 `structured` 时把 final text 原样返回（父拿到字符串而非 null）；
  上游若要兼容现存脚本，推荐 diagnostics 方案。
- 上游批与退役口径 = [收口 Note](../../notes/implemented/2026-11-08-delegation-contract-repair.md)。
- **未做（本仓做不到）**：父代理拿不到“答对但形状不对”的诊断——任何本仓层都改不了 `agent()` 的返回值；
  造一个 workflow 包装工具 = 平行实现（质量上不可接受），故不做。

- **推进路径（二选一，需拍板）**：
  - **A. 上游真修（推荐）**：把上面三处改动提给 DSH upstream → 发布新 tag → 本仓
    `node tools/sync-dsh.mjs --pin <tag>`（升 pin 是用户策动制）→ 跑 `workflow-contract-smoke`
    （第 5 条需改断言：`null` + `diagnostics` 进工具结果）→ 改 `eng-teaming` 一句 → 翻 `已修` 归档。
    依赖：有人能改 upstream + 升 pin；本仓侧我可以先产出可套用的 patch 与 vendor 测试。
  - **B. 改验收口径（10 分钟、不修机制）**：把判定第一条改成“父代理有可判读的替代证据（skill 明确
    schema 模式 null 的语义 + 父脚本按 missing 记账）+ 检测锚点”，并注明**这是口径变更、机制仍未修**、
    上游提案保留。需要用户明确授权（章程禁止改标准迁就实现）。

## 已修判定

- 带 schema 的分支只回文本时，父代理至少能拿到“形状不匹配”的诊断（而不是裸 null）；且
- 本仓技能/任务书要求带 schema 的分支显式调用 `structured_output`，并在真实会话中稳定观察到
  父代理不再把 null 当纯失败。
