---
status: 等人拍板
owner: 用户
blockedBy: []
opened: 2026-10-19
updated: 2026-10-19
---

# 推敲：issue 卡本身的质量——当前态被历史埋住，怎样收口成 DSH-native 卡

> 立卡：2026-10-19 ｜ 状态：等人拍板 🔒 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否

**依赖与触面（Card v2 可选字段，放正文以守住门禁的 12 行窗口）**：`blocker = needs-user-priority`（选择 A/B/C）；`touches = _backlog/issues, _backlog/research`。`backlog-liveness` 只在前 12 行找状态行；frontmatter 超过 5 个字段会把状态行挤出窗口——这是 B 方案必须先解决的一个约束。

## 当前结论（只写 now）

四张公司面 issue 卡（[父卡](2026-10-19-company-panels-ux-priority.md)、[看板/依赖图](2026-10-19-board-dag-ux-deep-dive.md)、[任务板](2026-10-19-taskboard-table-ux-deep-dive.md)、[台账](2026-10-19-ledger-ux-deep-dive.md)）的**证据**不差：自说明、事实表、反证、验收、reviewer 指南都齐，密度高于一般 issue。**当前态**有四类不清：

1. **当前态/历史混写**：卡顶已说“核心不再是正确性”，下面仍写“两个致命结论”“先修数据 BUG-026/027”；验收还引用已归档 BUG 的“已修判定”。
2. **状态/门票/依赖不匹配**：三张子卡 `推敲中` 但下一步是“等你点”；父卡已补 🔒（本轮），三张子卡仍缺 `blockedBy`；`## 验收标准`（自称毕业门票）与 `毕业：未定` 并存；父卡/子卡依赖仍隐式。
3. **索引/调研稿旧结论没清**：`issues/README` 的三行旧结论本轮已订正；真相复核 §五/§六、盘点 §五仍按被证伪的 §三/§二/§四下结论，已加失效指针但未重写。
4. **证据层/样本口径不标**：golden 把 `record.rows.agentTeam.val`（state）当 wire，又用 `ownerId` 反推 owner；298/379/344/273 各是什么样本没标；行号引用已漂移。

长证据 = [issue 卡质量审调研](../research/backlog-ux/2026-10-19-issue-card-audit.md)。

**本轮已先做的最小订正**（不改变 A/B/C 的选择）：`issues/README` 四行旧结论已改；父卡状态行补 🔒；四张卡与两份调研加质量审指针；本卡与调研稿已入索引。**剩余是正文收口**，即 A/B/C 要选的部分。

**要你拍的是收口路径**：

- **A 内容收口**：修陈旧事实、每卡加 `## 当前结论`/`## 修订史`、子卡 `blockedBy` 父卡、验收暂标“草案”、README 减成薄索引、研究稿加失效指针。不改章程/门禁。
- **B A + Card v2**：加 `owner/blockedBy/blocker/touches/updated`，加 `backlog-status` 派生视图脚本 + 语义审 skill + 2–3 条机械不变量（带红/绿）。
- **C 先试点**：先选一张公司面卡，用 `ask_user_question`/`exit_plan_mode` 拍板、`todo_write`/`goal` 执行；跑通后再回来 A/B。

推荐 **A → B**；C 在选中的那张卡上跑。若只做一件事，先 A：现在不管选哪张，读者都得先猜“哪句是现在”。

## 已确认（摘要，逐条证据见调研）

| 事实 | 层 | 证据 |
|---|---|---|
| 四张卡都有“旧结论仍以现在时出现”的段落 | source | [调研 §二](../research/backlog-ux/2026-10-19-issue-card-audit.md#二逐条发现) |
| 形状门禁全绿，内容仍漂移 | runtime | `node checks/run-gates.mjs` → **ALL PASS**；章程自述“检查通过不证明结论正确”（[README](../README.md) §文件与维护） |
| 行数引用已漂移：374/379、99/105、162/105 | source | `wc -l`：`company-panels.tsx` 379、`TasksPanel.tsx` 105、`LedgerTab.tsx` 156 |
| BUG-025 已修、BUG-026 误报、BUG-027 已修 | state | [025](../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md)、[026](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md)、[027](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md) 的结论节 |
| 任务板 `（阻塞）` 已按 BUG-027 同族修复 | source | [TasksPanel.tsx](../../packages/company-pack/src/client/TasksPanel.tsx) 的 `TasksTableView`「（阻塞）」行 + [spec](../../tests/client/tasks-table.spec.ts) 的 describe 块 |
| golden 计划读 state 而非 wire，可能假绿 | source | [board.ts](../../packages/company-pack/src/lib/board.ts) 的 `tasksFromTeamView` 读 `ownerName`；[presence.ts](../../packages/company-pack/src/lib/presence.ts) 的 `TeamViewLike` 输入形状 |

## 未决（需要你拍）

1. **A/B/C 走哪条？** 推荐 A → B；C 在选中的公司面卡上跑。
2. **若 B：字段先上哪些？** 建议先 `owner/blockedBy/blocker/updated`，`touches` 作为可选告警面（它对应 DSH task board 的 `writeScopes`，重叠只告警不阻塞）。
3. **若 A：全收口还是先父卡 + 看板卡？** 建议先父卡 + 看板卡（最 stale 的两张），任务板/台账搭同一轮；否则四张一起改，diff 太大、review 不动。

## 方案与取舍

| 方案 | 做什么 | 代价 | 收益 | 风险 |
|---|---|---|---|---|
| **A** | 修事实、加当前态/修订史、改状态/README、加失效指针 | 小（1–2 小时） | 读者能直接读到 now；门禁仍绿 | 不防复发；下一版仍可能叠历史 |
| **B** | A + Card v2 字段 + 生成视图 + 语义审 skill + 2–3 条不变量 | 中（半天） | 当前态有单一来源；跨卡依赖/重叠可见 | 字段/模板要迁移；过度仪式化 |
| **C** | 选一张卡，走 DSH 批准/执行面 | 小（一张卡） | 验证 plan/todo/goal 是否顺手 | 只试点，不解决其余三张 |

**不借的**：不把 issue 搬进 taskboard（session 运行时，不是 git）；不用 `todo_write` 当 backlog（无 id/依赖/owner）；不引入手工 `revision` 数字（git 已有 diff/冲突）；不再堆形状门禁（先把当前态写对）。

## 范围与排除项

- **范围内**：四张公司面卡、`issues/README`、两份公司面调研的失效段、本卡与调研稿。
- **范围外**：不改公司面板行为、不改 vendor、不新建 issue tracker、不重写四张卡的历史正文（被证伪的假设保留在修订史）。本卡只做决定与交接，不实施。

## 验收标准（草案）

> `毕业：未定` ⇒ 本节只是草案；你选 A/B 后可翻 `毕业：做` 并去掉“草案”。

- **A 完成判据**：调研 §二 A/B/C 组的高严重度条目全部处置；每张活跃卡顶部能在 20 行内回答“什么是 now / 什么未决 / 谁下一步”；`issues/README` 不再含“BUG-026 走哪条路”“owner 空”这类旧结论；研究稿 §五/§六/§五有失效指针；`node checks/run-gates.mjs` 绿。
- **B 完成判据**：A 的全部 + `owner/blockedBy/blocker/updated` 四字段进四张卡；`backlog-status` 能从 frontmatter 生成活跃清单（不再手写“当前情况”）；语义审 skill 可被调用并能在真卡上产出 finding；2–3 条不变量各有“红→还原→绿”记录。
- **C 完成判据**：选中的卡经 `ask_user_question`/`exit_plan_mode` 记录拍板、经 `todo_write`/`goal` 执行一轮；卡上留下真实命令与结果；未跑项标“未执行”。

## 证据（可复跑）

| 事实 | 样本/层 | 命令或出处 | 日期 |
|---|---|---|---|
| 形状门禁全绿 | runtime | `node checks/run-gates.mjs` | 2026-10-19 |
| 行数 | source | `wc -l packages/company-pack/src/client/{TasksPanel,company-panels,LedgerTab}.tsx` | 2026-10-19 |
| 旧结论分布 | source | `grep -R "BUG-026\|BUG-027\|等你点\|owner 列空" -n _backlog/issues _backlog/research` | 2026-10-19 |
| 逐条发现 | source | [调研 §二](../research/backlog-ux/2026-10-19-issue-card-audit.md#二逐条发现) | 2026-10-19 |

## 修订史（只追加）

- rev 1 2026-10-19：立卡；把四张卡/两份调研的质量审结论从会话移入 issues；本卡未改四张公司面卡的正文。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：① “四张卡已经很清楚了，只是没排版”——请只读卡顶 20 行，看能否答出“now/未决/谁下一步”；② “门禁全绿所以没问题”——`backlog-liveness` 只查形状；③ “taskboard 可以直接替掉 backlog”——它活在 Lead 会话日志里，不是 git；④ “golden 用 state 也行”——生产读 wire 的 `ownerName`。
- **口径**：本卡只认“当前态可读 + 证据层/样本可复算 + 状态与下一步一致”；审美争议不算缺陷。
- **别做**：不要为了收口而重写四张卡的历史正文；被证伪的假设留在修订史。不要在没有红/绿证据时新增门禁。
