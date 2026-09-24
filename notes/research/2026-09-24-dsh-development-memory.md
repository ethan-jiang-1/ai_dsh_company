# DSH 开发记忆：notes 如何支撑开发

日期：2026-09-24  
状态：部分采纳（[Notes 入口与事实维护](../implemented/2026-09-24-foundation-first-step.md)）；本仓流程适配仍待核，不据此自动重构或迁移。
研究基线：`vendor/dsh` HEAD `fb2c4b9e698e30edb738bca4cf0618587db7d203`（本仓登记的 `dsh-v0.1.5-rc.2`）。以下只引用 vendor 内的一手规则、源码、门禁和代表性 Agent Note；vendor 未修改。

## 结论

DSH 的 notes 是按生命周期和决策类别组织的活动记忆：它保存为什么这样做、放弃了什么、实现后需要维护哪些事实以及验证证据；代码、README 和门禁分别承载实现、当前契约和可执行约束。Agent Note 不是 PR 日志，也不是冻结的实现备忘录；只有明确进入 `archived/` 的 implemented 三件套才是冻结历史。

## 六个阶段的证据链

1. **新 agent 开工：先检索相关活动 Note，按路径理解状态。** DSH 将 `proposed/`、`implemented/`、`rejected/` 定义为生命周期，并将 class 编进路径；活动树本身就是工作库存，不建立集中索引。非平凡变更必须在同一变更中新增或更新 Note，除非只是纯机械或局部编辑。[Agent Note 布局与生命周期](../../vendor/dsh/.agents/notes/README.md#layout-and-naming) · [何时写 Note](../../vendor/dsh/.agents/notes/README.md#when-to-write-one) · [源码树入口也明确 `.agents/` 是 workflows 与 notes](../../vendor/dsh/AGENTS.md#repository-layout)

2. **决策：把动机、选择和输掉的方案交接给下一位 agent。** 每份 Note 以 `Problem` 开始；implemented Note 用现在时的 `Decision` 和 `Consequences`，所有生命周期都要求 `Alternatives considered`。这使下一轮能复用边界和取舍，而不是从代码反推决策。格式门禁 `verify-agent-note-format` 将这些要求变成 `doc-sync` 的可执行检查。[文件格式与生命周期骨架](../../vendor/dsh/.agents/notes/README.md#the-file-format) · [强制 alternatives](../../vendor/dsh/.agents/notes/README.md#alternatives-considered--mandatory) · [格式门禁源码](../../vendor/dsh/scripts/verify-agent-note-format.ts)

   代表性决策记录是 [Plan-specific collaboration state](../../vendor/dsh/.agents/notes/implemented/simplification/2026-07-22-plan-specific-collaboration-state.md)：它明确 plan 是一个具体产品包，列出被删除的泛化 API、独立的 sandbox/approval 边界、多个替代方案及其失败原因，并在 `Verification` 中说明已覆盖的测试和仍缺的 assembled-app snapshot。这正是新 agent 选择实现路径和识别验证缺口所需的上下文。

3. **实现：让实现事实回写到拥有决策的 Note，并让源码指回它。** implemented Note 必须随代码同步更新路径、符号、默认值和机制；若决策逆转，写新 Note 并互链，不能把旧 Note 改写成相反决定。[implemented 维护规则](../../vendor/dsh/.agents/notes/implemented/AGENTS.md) · [生命周期迁移规则](../../vendor/dsh/.agents/notes/README.md#moving-between-lifecycles) · [plan-mode 源码的 Agent Note 指针及其当前机制](../../vendor/dsh/packages/plan/plan-mode/src/index.ts)

   [Event-sourced sessions](../../vendor/dsh/.agents/notes/implemented/architecture/2026-06-11-event-sourced-sessions.md) 展示另一种实现记忆：它记录 Session 日志是唯一真相、消息由日志派生、append/flush/排序约束以及唯一被拒方案；实现者可据此判断新状态应进入事件日志还是另造可变镜像。

4. **验证：Note 记录“需验证什么”，命令选择由影响面决定。** DSH 的 pre-push 流程明确说没有 universal local baseline；行为变更跑能捕获回归的最窄测试，文档/Agent Notes 跑 `doc-sync`，发布面跑 build/smoke，真实 provider 才跑 e2e；完整本地 rehearsal 只在用户明确要求、诊断 CI 或变更足够跨仓以至于无法可信缩窄时执行。[选择相关证据](../../vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md#select-relevant-evidence) · [完整本地 rehearsal 的触发条件](../../vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md#full-local-rehearsal) · [AGENTS 的相关检查原则](../../vendor/dsh/AGENTS.md#run-relevant-checks-locally)

   [Plan Note 的 Verification](../../vendor/dsh/.agents/notes/implemented/simplification/2026-07-22-plan-specific-collaboration-state.md) 把 package tests、command tests、keyless TUI 场景和一个尚缺的 assembled snapshot 分开列出；它没有用“全套测试通过”掩盖覆盖边界。[Agent Note 格式决策](../../vendor/dsh/.agents/notes/implemented/process/2026-07-05-uniform-agent-note-format.md) 还说明格式门禁本身是为避免仅靠 review 记忆而加入的可执行约束。

5. **维护：把 Note 当活的决策记忆，而不是历史附件。** implemented Note 继续接受事实性维护；路径/名称/默认值变化应在同一变更中更新。文档标准同时要求当前文档只写 now，并把 rationale 放回 Agent Notes，避免同一事实多处漂移。[implemented 维护规则](../../vendor/dsh/.agents/notes/implemented/AGENTS.md) · [文档层级与“一处事实一个家”](../../vendor/dsh/docs/AGENTS.md#the-tier-taxonomy-one-home-per-fact) · [DSH 根约定：非平凡变更需 Note](../../vendor/dsh/AGENTS.md#conventions)

6. **归档：只按未来决策价值封存 implemented，封存后不再作当前权威。** 只有 implemented Note 可归档；若 rationale、alternatives、negative guarantee、durable/wire semantics、security rule 或 reintroduction condition 仍会指导未来工作，就继续留在 active。归档必须移动完整 English/Chinese/sidecar 三件套，只加同一 `Archived: YYYY-MM-DD` 行并更新 manifest；archive 树随后永久冻结，不能编辑、移动、修复或当作当前行为依据。[归档规则](../../vendor/dsh/.agents/notes/README.md#archiving-and-deletion) · [归档树指令](../../vendor/dsh/.agents/notes/archived/AGENTS.md) · [归档决策的未来价值标准](../../vendor/dsh/.agents/notes/implemented/process/2026-07-26-frozen-agent-note-archive.md) · [归档门禁源码](../../vendor/dsh/scripts/verify-archived-agent-notes.ts)

## DSH 协作工具如何接入这条链

- **plan mode 是用户选择的审阅边界。** `plan` 包把状态写入 `plan/mode` 日志，`exit_plan_mode` 将完整计划交用户批准或要求继续规划；plan mode 本身是 guidance，不过滤工具，sandbox/approval 另有 owner。[plan README](../../vendor/dsh/packages/plan/README.md) · [plan 源码的 reviewed exit](../../vendor/dsh/packages/plan/plan-mode/src/index.ts)
- **todo_write 是会话级进度投影。** 它每次整体替换列表，允许部署决定是否并行 `in_progress`，完成项应即时标记，简单单步任务可跳过；写入记录属于创建它的 agent session；源码的当前列表投影会在下一次 `turn/start` 清空，不能代替跨会话的决策记录。[todo README](../../vendor/dsh/packages/todo/README.md) · [todo 工具描述与校验源码](../../vendor/dsh/packages/todo/tool-todo/src/index.ts)
- 因此，plan/todo 能把“当前工作如何推进”变成 model-visible、可恢复的会话状态；Agent Note 则保存跨会话的决策、取舍和验证记忆，两者不是同一层数据。

## 本仓容易误读的三件事

- **“implemented = 冻结”是错的。** DSH 明确要求 implemented 随 shipped reality 更新；冻结边界是 `archived/`，而且 archive 不再是当前权威。[implemented 维护规则](../../vendor/dsh/.agents/notes/implemented/AGENTS.md) · [archived 冻结规则](../../vendor/dsh/.agents/notes/archived/AGENTS.md)
- **“清理必须数量净减”不是 DSH Agent Note 规则。** DSH 的归档标准是语义上的未来指导价值，不按字数、年龄或 quota；它允许为保留历史而归档，也要求保留仍会防止重犯的记录。[归档 skill 的分类标准](../../vendor/dsh/.agents/skills/dsh-archive-agent-notes/SKILL.md#classify-by-future-value) · [归档决策的 alternatives](../../vendor/dsh/.agents/notes/implemented/process/2026-07-26-frozen-agent-note-archive.md#alternatives-considered)
- **“每次必须 plan、每次必须 full tests”不是 DSH 规则。** plan mode 是显式进入的协作功能；它保留所有工具可用，`exit_plan_mode` 是用户审阅点。[plan README](../../vendor/dsh/packages/plan/plan-mode/README.md#the-reviewed-exit)。todo 工具对 trivial single-step 明确允许跳过；验证流程要求按变更面选择最小证据，完整本地 rehearsal 只有明确触发条件才跑。[todo 工具源码](../../vendor/dsh/packages/todo/tool-todo/src/index.ts) · [最窄检查规则](../../vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md#select-relevant-evidence) · [完整 suite 触发条件](../../vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md#full-local-rehearsal)

本仓若把 plan/todo、`pnpm verify`/`pnpm test` 或“每次整治净减少”定为更严格的本地合同，应明确标成**本仓适配政策**，不要回写成 DSH 一手规则。

## 最小落地建议

1. 开工：按条目或机制检索 `notes/implemented`、`notes/proposed` 和相关 postmortem，只读命中的 Note；先获得决策、失败方案、边界和验证缺口，再动代码。[DSH Note 工作库存规则](../../vendor/dsh/.agents/notes/README.md#layout-and-naming)
2. 决策：非平凡变更在同一 diff 新增或更新 Note，至少保留 `Problem`、当前 `Decision`/`Proposal`、`Alternatives considered` 和 `Verification`/`Consequences` 所需事实；不要把聊天结论当交接。[何时写 Note](../../vendor/dsh/.agents/notes/README.md#when-to-write-one) · [implemented 骨架](../../vendor/dsh/.agents/notes/README.md#implemented)
3. 实现与验证：实现路径、名称、默认值变化同步更新 implemented Note；按受影响面选一个最小、会对回归失败的检查，并在 Note 中只写实际运行的命令和结果。[implemented 维护](../../vendor/dsh/.agents/notes/implemented/AGENTS.md) · [相关证据选择](../../vendor/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md#select-relevant-evidence)
4. 维护与归档：新 Note 写入时做一次同机制的 supersession 检索；只有 implemented 且未来指导价值低时才按完整 triplet 归档并封存，不以数量目标批量删除。[notes 子树规则](../../vendor/dsh/.agents/notes/AGENTS.md) · [supersession 与归档](../../vendor/dsh/.agents/skills/dsh-archive-agent-notes/SKILL.md#check-supersession-when-adding-a-note)

研究结论的边界：以上描述的是钉住 commit 的 DSH 机制。`notes/` 的具体目录映射、每次本地命令和额外卫生方向由本仓自己的 `AGENTS.md`、`docs/guides/60-dev-loop.md` 与 `scripts/verify.mjs` 另行规定；它们不能被反向表述成 vendor 原生规则。
