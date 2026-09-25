# 2026-09-26 · journal 缺席机制：文案已证无效，需要可检测 + 换执行者

状态：proposed（来源 = ROADMAP §磨清单唯一在册项；**执行待批准**）

## 问题

「收工留痕」是硬闸门，但**行为上管不住**：

- 打磨轮（2026-09-25）给五份 skill 的收工步加了硬闸门语气（"没写 journal = 任务未完成"），
  排练实测**红证**：draft 按工作流正常产出，journal 步照跳（8→8 篇）。
- 更早的事故同款：`emergency-x-incident-review` 场 VP-Eng / COO 未留 journal（W8 缺口，事后补记）；
  新动议×2 场又记一次"journal 缺口二犯"。
- 结论（打磨轮已裁）：**这是行为问题不是文档问题**，按"文案不够、需机制"重挂磨清单。

**缺的机制是什么**：现在既没有**检测**（缺席无人知道，直到下次复盘翻 journal 才发现），
也没有**换执行者**的检查（缺席者自己不会报自己缺席）。

## 候选（三案，A+B 建议同轮，C 归上游）

### A · 仓库侧审计脚本 `scripts/journal-audit.mjs`（deliverables-check 家族）
从会话日志（`$DSH_HOME/sessions/...`）读 `team/task` 事件，对每个 `status = completed` 的任务，
要求其 **owner 角色**的 `kb/<role>/journal/` 里有当轮条目（按 slug 或时间窗匹配）；
输出"哪场 / 哪个角色 / 哪个任务缺 journal"。性质 = **事后检测**，与 `deliverables-check.mjs` 同族
（缺 DSH_HOME 自拒、只读、keyless、可复核）。
- 价值：缺席**从"没人知道"变成"可复核的违规"**；轮末收敛时顺手跑一次。
- 局限：不拦运行时（跑完才发现）。

### B · CEO 定稿盘点步加"成员 journal 在场盘点"（**换执行者**，不是加自我提醒）
`chairing-staff-meeting` 第 5 步已有"定稿前盘点保留账"；同处加一条**逐角色点名 journal 是否在场**，
缺席者不进收口（CEO 让其补写后再合稿）。
- 价值：检查者从"缺席者自己"换成"CEO"——**文案但换了执行者**，与 A 的"只加一句自我提醒"不是一回事。
- 局限：仍是内容层约束，得靠真动议实测（与问询节流同性质）。

### C · 运行时拦截（任务完成的前置条件）
**核过 vendor**：`packages/guard/` 只有 `repeat-tool-reminder`（advisory 循环卫生）与
`timeout-policy`（协作超时），**没有"完成前置条件"类 seam**；要拦 `team_task_complete`
得改 vendor 或自造守卫 ⇒ **归上游 seam 提案**（提"工具完成前置条件"扩展点），本仓不自建（D13）。

## 输掉的方案

- **继续加文案**（再写狠一点）：已证无效（8→8 红证）。
- **自建调度器/记忆服务**：D13 不自造；journal 是角色的记忆载体，不是机器产物。
- **机器自动生成 journal**（从会话日志折出"纪要"）：丢"角色自己写的记忆"语义，且会把
  "角色没做收工"这件事**掩盖**成"系统帮他做了"——正好是我们要检测的东西。
- **把审计做成硬门禁进 `pnpm verify`**：verify 是结构门禁（不依赖会话日志），journal 审计依赖
  `$DSH_HOME` 真跑产物 ⇒ 归属"按面选跑的审计档"（同 deliverables-check），不进 verify。

## 验收

- A：脚本能在**排练场既有日志**上跑出结果；**反证** = 造一场"某角色完成但无 journal"的场次 ⇒ 报违规，
  补齐后转干净；缺 DSH_HOME 自拒（同 deliverables-check 口径）。
- B：`preset-smoke` ALL PASS（skill 改动完成定义）+ 下一场真动议**journal 在场率 100%**；
  仍缺席 ⇒ **如实记红证**并按 C 转上游（不硬凑）。
- `pnpm verify` / `pnpm test` 保持绿。

## 风险

- A 的匹配口径（按 slug / 时间窗 / 任务 id）可能误报或漏报——**先在既有日志上标定**，宁可标"存疑"。
- B 会给 CEO 收口加一步；若拖慢收口，按"只点名缺席者、不逐篇读"控制成本。
- C 的时间不可控，不阻塞 A/B。

## 依据

- 磨清单项与红证：[ROADMAP §磨清单](../../ROADMAP.md)；打磨轮收尾 =
  [implemented/polish-round](../implemented/2026-09-25-polish-round.md) §实施实况。
- 同族审计脚本形态：[deliverables-check.mjs](../../scripts/deliverables-check.mjs)。
