---
topic: 流程
intent: "为 issue 卡质量审与 DSH-native 收口提供逐条证据：四张活跃卡/两份调研的陈旧、矛盾与状态问题，以及 Card v2 的取舍。"
---

# issue 卡质量审：当前态为什么看不清，以及怎样接回 DSH 结构（2026-10-19）

服务：[已结质量卡](../../_archive/settled_issues/2026-10-19-issue-card-quality.md) 与四张公司面卡（A 收口依据）；本文的 A/B/C 取舍中 A 已执行，B 以后做，C = 执行协议。

**口径**：只读审计。读了四张活跃卡、[issues/README](../../issues/README.md)、两份公司面调研、[research/README](../README.md)、[_backlog 章程](../../README.md)、三张缺陷卡结论（[BUG-025](../../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) / [BUG-026](../../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md) / [BUG-027](../../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)）与相关源码；实跑 `node checks/run-gates.mjs`（**ALL PASS**）、`wc -l`、若干只读 `node` 脚本与 `grep`。**没开浏览器**；凡浏览器结论都标“未执行”。

## 一、总判断

**四张卡不是水卡。** 每张都有自说明、事实表、反证、验收标准和 reviewer 指南；证据密度、自纠错意识明显高于一般 issue。研究稿还给可复跑脚本、红/绿证据和限制节——这些都应保留。

**问题不是“事实少”，是“当前态被历史埋住”。** 三版订正叠在同一份正文里：卡顶说“核心不再是正确性”，下面仍写“两个致命结论”“先修数据”；README 还停在前一版；状态行说“推敲中”，下一步却说“等你点”。读者要先做一次考古，才知道哪句是 now。

**同一失败类在文档层重演。** BUG-026/027 的教训是“复现脚本必须指到消费者真正读的那一层”；这四张卡现在读 **state** 当 **wire**（golden 快照）、读 **旧版**当 **现状**（正文订正）、读 **索引**当 **卡片**（README）。层错了，量得再准也是别的东西。

**门禁全绿不构成反证。** `backlog-liveness` 查目录、README、status 枚举、状态行镜像、`毕业：` 封闭头、索引链接与闭场信号（[gate](../../../checks/gates/backlog-liveness.mjs) 的 `run` 函数，[实现](../../../tools/lib/backlog-liveness.mjs) 的 `statuses`/状态镜像段），不查“当前结论是否成立”。章程自己写了“检查通过不证明问题结论正确或方法有效”（[README](../../README.md) §文件与维护）。

## 二、逐条发现

**时点**：下表是 2026-10-19 审计时点；立卡轮已先修 `issues/README` 三行与父卡 🔒（见卡“本轮已先做的最小订正”）。剩余条目仍是当前缺口。

### A. 当前态 / 历史混写

| # | 严重度 | 位置 | 问题 | 证据 / 建议 |
|---|---|---|---|---|
| A1 | P1 | [看板卡](../../issues/2026-10-19-board-dag-ux-deep-dive.md) §「已确立的事实 / 本轮范围」 | 「两个致命结论」仍说“正确性缺陷已确认两条”；“本轮范围”第 1 条仍写“先修数据 BUG-026/027” | 与同卡「核心不再是修正确性缺陷」直接冲突；026 是误报、027 已修。当前段应只留呈现层 + golden 判据 |
| A2 | P1 | [看板卡](../../issues/2026-10-19-board-dag-ux-deep-dive.md) §「验收标准」 | 仍把 BUG-026/027 的「已修判定」当验收条目 | 两个 BUG 已归档；026 的“已修判定”是在误报结论之前写的。条目要么已满足，要么不可执行 |
| A3 | P1 | [任务板卡](../../issues/2026-10-19-taskboard-table-ux-deep-dive.md) §「已确立的事实 / 本轮范围」 | 「修 owner 后要重测（BUG-026 不修…）」；「BUG-027 修好后需同步复核」 | 同卡 §「已确立的事实 / 验收标准」说 026 是误报、无需修复；`（阻塞）` 已在 [TasksPanel.tsx](../../../packages/company-pack/src/client/TasksPanel.tsx) 的 `TasksTableView` 修掉并有 [spec](../../../tests/client/tasks-table.spec.ts) 的 describe 块 |
| A4 | P1 | [优先级卡](../../_archive/settled_issues/2026-10-19-company-panels-ux-priority.md) §「建议 Top 3 / 依据」 | “owner 列空”“先依赖 ① 修 owner”；还说在场连带 BUG-026 | owner 在 wire 上齐全；① 没有 owner 修复任务；026 已结。“三条已确认缺陷…不需要浏览器就能修”也已过期 |
| A5 | P1 | [issues/README](../../issues/README.md) §活跃清单 | 旧版还写“BUG-026 走哪条路”“owner 空”“已确认两条真缺陷 BUG-026/027” | 三条都已撤回/关闭；本轮已先改这三行，但正文/状态仍未收口 |
| A6 | P1 | [真相复核 §五/§六](../company-panels-ux/2026-10-19-panel-truth-audit.md) | §五仍以被证伪的 §三为依据说“真值缺 owner、ready 放宽、必须换底”；§六仍说 owner 全缺可能是开发 home 特有 | 与文首补正相反；正文仍在判断路径上。本轮已加失效指针，未重写 |
| A7 | P1 | [盘点 §五](../company-panels-ux/2026-10-19-panel-inventory-and-priority.md) + [research 索引](../README.md) | §五仍推荐台账 Top 1；索引只说 §二/§四订正 | §五正是建立在 §二/§四上，也失效了；本轮已加指针，未重写 |
| A8 | P2 | 看板卡标题 / 任务板卡标题 | 看板卡仍叫“正确性优先：板面必须等于投影真值”；任务板卡仍叫“与看板口径一致性” | 两张卡的内容都已转向呈现层/可读性；标题是上一版的遗留，只读标题的人会误判 |

### B. 状态 / 门票 / 依赖

| # | 严重度 | 位置 | 问题 | 证据 / 建议 |
|---|---|---|---|---|
| B1 | P1 | 三张子卡 + [章程](../../README.md) §双轨状态生命周期 | 子卡 `推敲中`，但 README/下一步都说“等你点”；父卡 `等人拍板` 原缺 🔒（本轮已补） | 下一步是用户选择：按章程应 `等人拍板` + 🔒，或用 `blockedBy` 父卡把“等另一张卡”与“等用户”分开。现在四张都像在等同一个用户 |
| B2 | P1 | 三张子卡 + [章程](../../README.md) §双轨状态生命周期 | `## 验收标准`（自称“毕业门票”）+ `毕业：未定` | 章程：`## 验收标准` 是“做”的毕业门票；门票已写、倾向未定，读者不知道该不该开工。应暂标“草案”或翻 `毕业：做` |
| B3 | P1 | [优先级卡](../../_archive/settled_issues/2026-10-19-company-panels-ux-priority.md) §未决问题 | “先做哪张”+“台账要不要重定位成成品台账”混在一张卡 | 两个独立决定；卡不能单独关闭；成品台账是新功能，不是 UX 轮 |
| B4 | P2 | 四张卡 | 没有 `owner` / `blockedBy` / `blocker` / `updated` | 父卡和子卡的依赖是隐式的；`推敲中`/`等人拍板` 两值表达不了“等另一张卡”与“等一个具体答案”的区别 |
| B5 | P2 | [优先级卡](../../_archive/settled_issues/2026-10-19-company-panels-ux-priority.md) §建议 Top 3 | 排序标准在段落间漂移：一会儿“证据强度”，一会儿“能 keyless 验且代价低”，一会儿“指挥视图重要性” | 三种标准会给出三个不同的第一；卡片没有说清用哪条，读者无法判断“看板第一”是事实还是口味 |

### C. 证据层 / 数字 / 多 owner

| # | 严重度 | 位置 | 问题 | 证据 / 建议 |
|---|---|---|---|---|
| C1 | P1 | [看板卡](../../issues/2026-10-19-board-dag-ux-deep-dive.md) §验证计划 + [研究 §五](../company-panels-ux/2026-10-19-panel-truth-audit.md) | 把 `record.rows.agentTeam.val`（state）原样当 golden，又用 `ownerId` 反推 owner | 生产读模型 `tasksFromTeamView` 读的是 wire 的 `ownerName`（[board.ts](../../../packages/company-pack/src/lib/board.ts)，形状见 [presence.ts](../../../packages/company-pack/src/lib/presence.ts) 的 `TeamViewLike`）。测试会再造一条生产不走的 owner 解析路径，可能再次假绿。golden 应存 wire，或测试先跑与 host 相同的 `projectTaskView` |
| C2 | P2 | 看板卡 §已确立的事实 / 任务板卡 §本轮范围 / 台账卡 §已确立的事实、验收标准 | “每 5 秒刷新”三张卡各写一遍 | 一个事实三个 owner；如果没先选看板卡，台账的验收条就满足不了。应合成一张小卡或明确归一个 owner |
| C3 | P2 | 看板卡 §这是什么 / 任务板卡 §这是什么 / [盘点](../company-panels-ux/2026-10-19-panel-inventory-and-priority.md) §一 | 行数 374/379、99/105、162/105；`styles.ts:179` 实际 184 | 引用已漂移；数字本身可能都对，但读者无法复算。改引用符号/命令，别只写行号 |
| C4 | P2 | 研究文首 | 同时出现 61 板/298 任务、379 行/344 owner、273/273 ownerName | 没标各自样本：全量 state、`ver === 4` wire、读模型全量。没有“样本/层”列，数字越多越像噪声 |
| C5 | P2 | [任务板卡](../../issues/2026-10-19-taskboard-table-ux-deep-dive.md) §验证计划（[看板卡](../../issues/2026-10-19-board-dag-ux-deep-dive.md) §验证计划 的 golden 也依赖未冻结样本） | 验证计划依赖“BUG-026 里那个 21 条板的会话” | 会话可能已删/换 home；计划不可复跑。应先冻结 golden 夹具，再写浏览器步骤 |
| C6 | P2 | 四张卡 | “本轮/上一版/现在”没有绝对日期锚 | 新读者不知道“本轮”是哪一轮；这是自说明卡的反面。用日期 + 修订号，不用 deixis |

## 三、根因

1. **卡是“日志 + 投影”混写。** DSH 的 session log 与 projection 分开：最新快照是状态，历史是事件。四张卡把三版订正都留在正文，顶部本应是投影，结果成了日志。
2. **状态有四个家。** frontmatter、状态行、README、散文；research 索引是第五个。第二清单必漂——本仓文档纪律也写了“别建集中清单（第二清单必漂）”（[docs/AGENTS.md](../../../docs/AGENTS.md)）。
3. **没有 `owner`/`blockedBy`/`blocker`/`ready`。** 父卡和子卡的依赖是隐式的；`推敲中`/`等人拍板` 两值表达不了“等另一张卡”与“等一个具体答案”的区别。
4. **门禁只查形状。** 枚举、镜像、索引、闭场信号都不查当前结论；所以 `pnpm verify` 全绿与内容陈旧可以同时成立。
5. **数字没有样本/层。** 行号、样本数、总/子集混用；引用会随代码漂移，而卡片没有“取法”列。

## 四、DSH-native 设计：借形状，不建第二套系统

### 4.1 映射

| 卡的部件 | DSH 现成结构 | 借什么 | 不借什么 |
|---|---|---|---|
| 当前态 | `todo_write` 的 whole-list replace + session projection | 最新快照 = 状态；每次重写，不在末尾追加“其实不是” | 不把 todo 的三态当 issue 生命周期 |
| 修订史 | session log | 只追加；被证伪的假设留在原地 | 不把日志当当前态 |
| `status/owner` | `TeamTaskSnapshot` | `status` + `ownerId` + `revision` | 不引入 CAS 数字（git 已有 diff/冲突） |
| `blockedBy/ready` | `TeamTaskSnapshot.blockedBy` + `taskReady` | 依赖 DAG；全部完成才 ready | 不把“等用户”硬塞成 task |
| `blocker` | `GoalBlockReason` | `{ code, message }`：稳定 code + 人读说明 | 不照搬 goal 的“3 轮才 blocked” |
| `touches` | `TeamTaskSnapshot.writeScopes` | 声明会碰的文件/面；重叠只告警，不阻塞 | 不把它当写权限 |
| 毕业/批准 | `plan-mode` 的 `exit_plan_mode` / `ask_user_question` | 计划呈批 / 选择拍板；结果回写卡 | 不把 plan mode 当持久存储 |
| 一轮执行 | `todo_write` | 本轮切片、三态、整表替换 | 不把 todo 当 backlog |
| 长程多轮 | `create_goal` | objective、phase、blockedReason、rounds | 不把 goal 当 issue 记录 |
| 多 agent 执行 | `team_task_*` / `agentTeam` | owner、blockedBy、writeScopes、CAS | 不把运行时板当 git 记录 |
| 批量审计 | `workflow` / `subagent` | 每卡一个 reviewer + 一个 cross-card reviewer | 不让 subagent 直接改卡 |
| 索引/视图 | projection / derived view | 目录 + frontmatter 即清单；README 生成 | 不手写“当前情况” |

一句话：**卡 = `TeamTaskSnapshot` 的持久投影 + `GoalBlockReason` + plan 的批准记录。** 它不是 taskboard，也不是 goal；它借用两者的形状，解决“跨会话、可 review、可归档”的问题。

### 4.2 Card v2 骨架

```md
---
status: 推敲中
owner: agent              # 下一步行动者，不是实施授权
blockedBy: [2026-10-19-company-panels-ux-priority]
opened: 2026-10-19
updated: 2026-10-19
# 可选：blocker / touches 放正文，或同 diff 扩门禁窗口（见下）
---

# 推敲：<标题>

> 立卡：… ｜ 状态：推敲中 ｜ 类型：… ｜ 毕业：未定 ｜ 可关闭：否

## 当前结论（只写 now）
- 问题
- 已确认（每条带 样本 / 层 / 日期）
- 未决（谁必须回答；`blocker.code`）
- 下一步

## 范围与排除项

## 验收标准（草案）      # graduation=做 时才去掉“草案”

## 证据（可复跑）
| 事实 | 样本/层 | 命令或出处 | 日期 |

## 修订史（只追加）
- rev 3 2026-10-19：撤回…；影响…
```

证据层的受控词：`source`（读码/配置）、`state`（持久投影 state）、`wire`（浏览器收到的视图）、`runtime`（真浏览器/DOM）、`human`（人读/计时/可读性判断）。每个数字标一个层，避免再犯“state 当 wire”。

**门禁窗口约束（本轮实测）**：`backlog-liveness` 只在 `slice(0, 12)` 里找状态行（[实现](../../../tools/lib/backlog-liveness.mjs) 的状态行查找段）。frontmatter 超过 5 个字段（`status/owner/blockedBy/opened/updated`）就会把状态行挤到第 13 行，门禁红。B 方案若保留 `blocker/touches`，要么放正文（如元问题卡），要么同 diff 把窗口扩到标题后/前 20 行，并带红/绿证据。**这是 Card v2 的第一个实现约束，不是排版偏好。**

### 4.3 三条硬规则

1. **当前态只写 now，历史只追加。** 当前段不允许删除线；被证伪的假设进 `## 修订史`，不留在判断路径上。
2. **一个事实一个家。** `status/owner/blockedBy` 只在 frontmatter；`blocker` 在 frontmatter 或正文（受 12 行窗口约束）；README、研究索引是生成视图，不再手写“当前情况”。
3. **运行时不进 git。** plan/todo/goal/taskboard/workflow 是执行面；卡只记耐久决定、证据与交接。

### 4.4 不借 / 不做

- **不把 issue 搬进 taskboard**：taskboard 是 Lead 会话日志里的运行时状态，不是 git 记录；换机器/删会话就没了。卡要跨会话、可 review、可归档。
- **不用 `todo_write` 当 backlog**：它没有 id、依赖、owner，且只属于一个会话；它是本轮执行面。
- **不把 `create_goal` 当 issue 记录**：goal 是一个会话一个目标，不是多卡清单；它适合“毕业后的长程实施”。
- **不引入 `revision` 数字**：git 已有 diff/冲突；手工 revision 只会多一个漂移点。用 `updated` + 修订史就够。
- **不再堆形状门禁**：先把当前态写对；要加门禁，只加“`## 验收标准` ⇒ `毕业：做`”“`等人拍板` ⇒ 🔒”这类有红/绿证据的机械不变量。

### 4.5 plan mode 就是毕业门票

DSH 的 `plan-mode` 不是“写计划”的装饰：`exit_plan_mode` 把完整计划交给用户 review，用户选 `Approve` 或 `Keep planning`；驳回带反馈，模型改完再提。它和本区问题轨的翻转表是同一形状：

| 问题轨 | plan mode | 记录 |
|---|---|---|
| `推敲中` | plan mode active：探索、设计，不落实施 | 卡顶 `## 当前结论` |
| `等人拍板` | review 打开，等用户 Approve / Keep planning | 卡上写清要拍的确切问题 |
| 用户 Keep planning | 反馈折回，回到 `推敲中` | 反馈进 `## 修订史` |
| 用户 Approve | 计划获批，`毕业：做`，交接实施 | 结论与去向进卡 |

差别只在持久性：plan mode 是会话态，卡是耐久记录。**所以“等你点”不是一句散话，它对应一个明确的 review 状态；卡上应写“等什么 review / 谁拍 / 拍完转到哪”。**

**优先级决定不是实施计划**：父卡问“先做哪张”是选择，用 `ask_user_question`；选中的子卡进入 plan mode，用 `exit_plan_mode` 呈批。把两者混成一句“等你拍”，读者就不知道要拍的是方向还是方案。

### 4.6 `blockedBy` 与 `blocker` 不是一回事

| 字段 | 借自 | 回答 | 例 |
|---|---|---|---|
| `blockedBy` | task board 的依赖 DAG | **等哪张卡**先关 | 三张子卡 `blockedBy: [父卡]`；父卡关掉后 `ready` 才为 true |
| `blocker` | goal 的 `blockedReason` | **为什么现在不动**（即使没有卡依赖） | 父卡 `{code: needs-user-priority, message: 先做哪张}`；看板卡 `{code: missing-wire-golden, message: 先冻结 wire 夹具}` |

`ready` 是由 `blockedBy` 派生的，不是新状态；章程的两值状态不变。现在的四张卡把两者混成了“等你点”：只有父卡真的在等用户，三张子卡等的是父卡。把它们分开，README 才能显示“哪张现在可动、哪张被谁卡住”。

### 4.7 `touches` 与语义审 skill

`touches` 借 task board 的 `writeScopes`：声明本卡会碰的文件/面，重叠只告警、不阻塞。例：看板卡与台账卡都碰 `CompanyView.tsx` 的“每 5 秒刷新”，告警会立刻指出“一个事实两个 owner”；指定一个 owner，另一卡只引用。这个告警可以做成只读脚本，不需要门禁。

语义审 skill 的 7 问（不是门禁，是人/agent 在翻状态或关轮前跑的检查）：

1. 只读卡顶 20 行，能答出“what is now / what is undecided / who acts next”吗？
2. 每个未决项都有 owner、下一步、`blocker.code` 吗？
3. 当前段有没有把已归档卡当开放工作引用？
4. `## 验收标准` 是否只在 `毕业：做` 时存在？
5. 每个数字都有样本、层、日期、命令吗？
6. 每个横切事实是否只有一个卡 owner？
7. golden/夹具的层与生产消费者读的层一致吗（wire vs state）？

这 7 问才是“质量层”；`backlog-liveness` 只证形状。两者都要，但不能互相替代。

## 五、收口方案

- **A（内容收口，最小）**：修 A1–A8、B1–B3、C1–C6 里的事实；每卡加 `## 当前结论` / `## 修订史`；子卡 `blockedBy` 父卡；`验收标准` 暂标“草案”；拆掉父卡的“成品台账”决定；README 减成薄索引；真相复核 §五/§六、盘点 §五加失效指针。不改章程、不改门禁。
- **B（结构固化）**：A + Card v2 字段（`owner/blockedBy/blocker/touches/updated`）+ 一个 `backlog-status` 派生视图脚本 + 一个语义审 skill（不是门禁）+ 2–3 条机械不变量（带红/绿）。
- **C（试点）**：先选一张公司面卡，用 `ask_user_question` / `exit_plan_mode` 拍板、`todo_write` / `goal` 执行；验证 DSH 流程顺手后，再回来做 A/B。

推荐 **A → B**；C 在选中的那张卡上跑。若只做一件事，先 A：现在不管选哪张，读者都得先猜“哪句是现在”。

## 六、反证与限制

- **没开浏览器**：所有“面板长什么样”的结论仍是读码/真数据级；视觉走查未执行。
- **样本是开发 home**：`runtime/harness-home` 的 1738 个会话含探针/调试样本；数字是分布，不是生产总量。换 home 复跑可能不同。
- **行号会漂移**：本稿的 `file:line` 是 2026-10-19 的树；后续改动后以符号/命令为准。
- **Card v2 是提案，不是已落地制度**：`owner/blockedBy/blocker/touches` 尚未进入 issues 模板与门禁；本稿只证明方向与取舍。
- **独立复核未合并**：本轮起的独立复核子代理未在时限内收口；本稿的逐条发现来自主 agent 的直接审计。后续可再跑一轮独立复核，合并时以文件原文为准，不以本稿摘要为准。

## 七、可复跑命令

```sh
cd /Users/bowhead/ai_dsh_company
node checks/run-gates.mjs                     # 形状门禁；本轮 ALL PASS
npx vitest run tests/harness/backlog-liveness.spec.ts
wc -l packages/company-pack/src/client/TasksPanel.tsx \
      packages/company-pack/src/client/company-panels.tsx \
      packages/company-pack/src/client/LedgerTab.tsx
grep -R "BUG-026\|BUG-027\|等你点\|owner 列空" -n _backlog/issues _backlog/research
```

数字/样本复核见[真相复核 §三](../company-panels-ux/2026-10-19-panel-truth-audit.md)；本稿不重写那些脚本。
