---
topic: 培养
intent: "核对钉住的 DSH 能力，判断公司角色个性化培养与 CEO 建议可复用的现成机制及其权限边界。"
---

# DSH 可复用培养能力（源码证据）

服务活卡：[2026-10-13-agent-cultivation.md](../../settled_issues/2026-10-13-agent-cultivation.md)。

## 证据范围

本研究依据仓库 pin 的 `vendor/dsh`，不是日用全局安装：根 `AGENTS.md` 记载 tag `dsh-v0.2.0-rc.2`、SHA `639ed015397290b3745d163aafe02ffee4aa3f84`；本轮 `git -C vendor/dsh rev-parse HEAD` 得到同一 SHA，`git -C vendor/dsh status --short` 无输出。只读 vendor 文件。源码证据链接均为相对 `vendor/dsh/` 的路径。

公司当前合同与 live Inspect 不混为一谈：[`docs/presets.md`](../../../../docs/presets.md) 及 [`packages/company-pack/cordis.patch.yml`](../../../../packages/company-pack/cordis.patch.yml) 是本仓合同/装配；当前 global Inspect 返回的是运行中组合的事实，不能代替 pin 源码，也不能单独证明 CEO/非 CEO preset 的会话行为。Inspect 是只读查询面，不是可供角色调用的业务 Service API。live `conversation.view` 只显 chat/trajectory、没有 company occupant，因此该 Inspect 视图也不是公司挂载截图证据。

## 确证事实

### 1. Skill 是现成的可复用培养载体

- `dsh-skill` registry 汇合 provider 与 runtime skill；provider/runtime 注册按调用 Context 所属 scope 入层。全局层与查看 agent 的 scope chain 合并，最近 scope 同名优先；同层再按 provider/rank 决定。见 [`packages/skill/skill/src/index.ts`](../../../../vendor/dsh/packages/skill/skill/src/index.ts)（`SkillLayer`、`registerProvider`、`register`、`list`）。
- `dsh-skill-filesystem` 可扫描 project、custom、user roots；配置 `customSkillDirs` 将附加根插在项目根之后、user 根之前，多个目录按声明顺序提供。frontmatter 是 catalog 元数据，正文按需加载；skill 正文每次 load 重读当前文件。见 [`packages/skill/skill-filesystem/README.md`](../../../../vendor/dsh/packages/skill/skill-filesystem/README.md) 与 [`packages/skill/skill-filesystem/src/index.ts`](../../../../vendor/dsh/packages/skill/skill-filesystem/src/index.ts)。因此“部署本地个性化 root + pack 通用技能”是无改 DSH 源码的候选：custom root 可承载部署资料，pack 可承载通用技能；但个性化能否按角色隔离，不能仅凭“root 本地”推断，仍须验证 scope、root 设置位置、优先级与同名覆盖行为。
- `dsh-tool-skill` 在首个请求前给模型技能名与摘要目录，使用 `skill` 工具加载全文；catalog 成员变化追加完整替换目录。正文改动不改 catalog digest、不通知模型；后续再次调用会读新正文，既有工具结果不会被改写或提示正文已更新。见 [`packages/skill/tool-skill/README.md`](../../../../vendor/dsh/packages/skill/tool-skill/README.md)。
- `skill-filesystem` 的 watcher 会使新增、改名、删除和 frontmatter 编辑在后续模型步骤刷新 catalog；正文每次 load 读盘，不需版本/cache invalidation。references/assets 等资源子树编辑不触发 catalog refresh。无 watcher 时另有第一方 fs write/edit invalidation 路径；shell 与外部写入的检测边界以 README 为准。见 [`packages/skill/skill-filesystem/README.md`](../../../../vendor/dsh/packages/skill/skill-filesystem/README.md)。
- 每个 Agent preset 是声明式、独立组合；preset registry 不提供目录扫描或 preset 文件编辑 API。存活 Agent 保留创建时的组合，新 Agent 使用当前定义；恢复后按保存的 preset id 取当前定义。见 [`packages/preset/agent-preset/README.md`](../../../../vendor/dsh/packages/preset/agent-preset/README.md) 与 [`packages/preset/agent-preset-registry/README.md`](../../../../vendor/dsh/packages/preset/agent-preset-registry/README.md)。本仓自己的四形态合同也明确工具/skills 不继承，角色根 preset 自包含；teammate 和 child 继承 Lead 组合。见 [`docs/presets.md`](../../../../docs/presets.md) §四形态矩阵与工具面。

### 2. 两种 session feedback 都不是模型的“培养输入”

- `dsh-command-feedback` 的 `/feedback` 与 `sessionFeedback` Remote 写 `feedback/record`；不启动模型、不进入模型历史，也没有 retrieval/aggregation/model-facing tool。见 [`packages/feedback/command-feedback/README.md`](../../../../vendor/dsh/packages/feedback/command-feedback/README.md)。它适合作为“用户对会话的反馈记录”，不等于 agent 能读到的逐条建议或自动改进信号。
- `dsh-message-feedback` 记录 finalized assistant message 的正/负评价、固定 taxonomy category 和可选原文 note。所有变更以 Session log 为唯一权威、可编辑/删除、有版本冲突保护并 flush 验证；反馈不进入模型历史。请求没有 authenticated actor/audit identity，README 明确要求部署保护 Host gateway。见 [`packages/feedback/message-feedback/README.md`](../../../../vendor/dsh/packages/feedback/message-feedback/README.md) 与 [`packages/feedback/message-feedback/src/index.ts`](../../../../vendor/dsh/packages/feedback/message-feedback/src/index.ts)。它可复用作消息质量评价的持久事实，但不能直接推出“CEO 建议已经送达非 CEO”，也不应当作 prompt/context 注入机制。
- `tool-session-query` 给模型五个只读工具，以 session `cwd` 完全相等授权跨会话查询；无 cwd 只能查自身。支持全文搜索、event search、lineage trace、event trace 与精确事件读取。它只适合在共享 workspace 权限确实符合预期时作为历史检索；搜索不含调用方 session、超 cap 需缩小查询、symlink 等价路径不视为同 workspace。见 [`packages/session-query/tool-session-query/README.md`](../../../../vendor/dsh/packages/experimental/tool-session-query/README.md)。本仓已装配它并记录“五角色共享工作区 => 跨角色可查”，仍应以当前会话日志确认实际工具暴露，而不能只据组合文件推断。

### 3. Agent instructions 是上下文，不是独立的培养状态

`dsh-agent-instructions` 首个请求注入 global 与项目到 cwd 的 `AGENTS.md` chain；不是连续 watcher，成功的结构化 read/write/edit 后才更新相关层级，resume 会 reconcile；有字节预算，宽层先省略、最具体文件截断。见 [`packages/context/agent-instructions/README.md`](../../../../vendor/dsh/packages/context/agent-instructions/README.md)。适合放稳定角色工作约束与公司手册，不适合储存频繁的个人反馈事件；不应把“文件被注入”误当作动态学习或授权机制。

### 4. CEO 给建议可复用用户问答/消息能力，但身份与交付语义需核实

- `dsh-user-questions` 可在 agent 等待时收集结构化用户答案；被其他 live Agent 持有的 child 不能直接问人（分水岭是运行时 parent/ownership，不是 CEO 角色名）；已继续问题的 Remote answer 会把回复 steer 为 `user-question-reply`，但它回答的是既有 question，不是 CEO 向下属发建议的通用投递 API。见 [`packages/interaction/user-questions/README.md`](../../../../vendor/dsh/packages/interaction/user-questions/README.md)。
- Team message 是本仓已装配的协作路径（`agent-team`、`tool-agent-team`），本轮仅凭 [`packages/experimental/tool-agent-team/README.md`](../../../../vendor/dsh/packages/experimental/tool-agent-team/README.md) 的描述可知成员可互相 message，但尚未验证消息语义是否符合“建议”、离线/冷会话投递与 target 身份映射；应作为优先探针而非预先定案。
- `user-approval` 只给敏感 tool action 单次 allow/reject/cancel/unavailable；需处于 open turn，answerer 缺失失败关闭，不携带 tool arguments，且无长期 grant。它不是建议、审核意见或持久对话通道。见 [`packages/interaction/user-approval/README.md`](../../../../vendor/dsh/packages/interaction/user-approval/README.md)。
- Remote identity 按具体接口而异，不可泛化为“Remote 用户身份已认证”。message-feedback README 说请求不含 actor/audit identity；session-query 的 caller 来自执行工具的 Agent；session-controller skill catalog 根据 Session id 的 cwd/preset 取技能视图。见 [`packages/feedback/message-feedback/README.md`](../../../../vendor/dsh/packages/feedback/message-feedback/README.md)、[`packages/session-query/tool-session-query/README.md`](../../../../vendor/dsh/packages/experimental/tool-session-query/README.md)、[`packages/api/session-controller/src/skill-catalog.ts`](../../../../vendor/dsh/packages/api/session-controller/src/skill-catalog.ts)。

## 机制限制与范围

- **“人人培养自己角色分身”目前不等于每个运行时 agent 自己改 preset。** 本仓合同规定培养权是 repo 写权限，skill/preset 自改已否决；DSH preset 是部署组合，不是角色会话的自助 profile editor。角色定制可能有 workspace/local skill 载体，但要验证授权人、作用域及部署边界，不能绕过 repo/pack 权限事实。既有裁定见 [`notes/implemented/2026-09-24-twin-cultivation.md`](../../../../notes/implemented/2026-09-24-twin-cultivation.md) 与 [`docs/presets.md`](../../../../docs/presets.md) §培养回路。
- **CEO spawn 继承错挂风险真实存在。** 本仓记录 teammate/child 使用 `composeFrom ⇒ agentPreset=ceo`，不是目标职能 preset（[`docs/presets.md`](../../../../docs/presets.md)）；若为非 CEO 个性化技能仅加在其独立 preset，CEO 委派出的对应角色不会自动加载它。反之，若将个人技能放在 global root，可能扩散给所有可见其根的 agent。两种结果都需从 live 会话 scope/catalog 验证。
- **Preset 定义更新不会改已有 Agent 组合。** 更新 preset 后需新 Agent 才使用定义；恢复 session 按 id 使用当前定义。不要把已有会话的 prompt prefix 变化误当成即时热更新。
- **Skill 正文历史是 append-only。** 已加载旧正文留在工具历史；更改文件不会改写旧结果，且正文改动没有独立版本提醒。培养评审需要比较实际读到的正文/日志。
- **Feedback 不自带审批或建议路由。** message-feedback API 没有 actor 身份；任何 Web gateway 的身份/授权必须由部署另证。approval 的“allow once”不应借用作建议确认或持久授权。
- **session-query 是读取权限而非协作消息。** `cwd` 精确相等即跨会话授权，意味着共享 cwd 上的角色互相可检索；它不会建立送达回执、建议状态或按职能 ACL。
- **不新增调度器或记忆系统。** 本仓已用 skill/工作区 journal/Session log/现成 Team、schedule 和 goal 载体；当前缺口更像定义个人反馈如何经人工评审转为角色 skill，以及 CEO 建议该由哪个既有会话通道送达。不要从反馈组件直接跳到第二套自动学习状态。

## 待探针事项（明确证伪问题）

1. **部署本地个性化 root 是否无需改 pack？** 在受控 profile 配置 `customSkillDirs`，确认它能从部署持久路径发现技能、正文按需读盘并被 watcher 发现；确认冷启动、新会话与已有会话的 catalog 更新时点。核对其是否实际为 global filesystem provider：若它在 Host/global scope，个人技能会不会对全体角色可见？若是，会证伪“root 自然按人隔离”。
2. **scope overlay 能否容纳个人技能且不改 DSH？** 对同名/异名 skill 分别比较 global、custom root 与 preset-scoped `ctx.skills.registerProvider/register` 的 catalog；验证最近 scope 覆盖、同层 rank、卸载和刷新。需要说明 customSkillDirs 本身的根 scope 由 provider mount 所属 Context 决定，不能把配置字段误解成每人一份。
3. **CEO 委派的身份与能力是什么？** 从 CEO root spawn 一个非 CEO 目标，检查 child preset id、skill catalog、skills/list Remote、`skill` 加载结果和 event/session authorship；对照该角色独立 preset 会话。验证 child 看到 CEO 的 global+CEO scope，还是目标职能 scope；不得仅由 team member 名推断其 agent preset。
4. **CEO 建议路径选型探针。** 检查 `tool-agent-team` 的 message 操作是否可从 CEO 定向发送建议给既有成员、成员冷却时是否 queued、接收者何时看到、是否有可观察送达/读取状态；与直接 Remote `session.prompt/steer` 的已有权限/所有权规则比较。建议文本不得冒充用户批准，且团队消息不等于权限变更。
5. **Feedback 身份与采纳闭环。** 用 Web 实测 `message-feedback` Remote 调用者身份是否由 gateway 外层可靠绑定；确认 canonical event 只有 feedback target/session、无 actor id。若要 CEO 读建议，验证是否已有 authorized session-query 取回路径，不能根据 feedback log-only 特性臆测模型可读。
6. **活体证据边界。** 以会话日志 `request/header.tools` 和实际 tool/result 为准验证 preset 生效与 skill body；profile Inspect 只读声明/运行组合，不是 business action，也不证明一条消息真正送达。

## 可复用优先建议（候选，尚未裁定）

1. **优先复用角色 skill 作为经人工审阅后的可复用方法论**：公司通用技能继续随 company pack preset 自包含；部署个性化先探 `customSkillDirs` 和现有 scope layers，确定谁可见、谁可写、如何回滚，再决定是否适合作为部署本地覆盖。避免为“个性化”先造第二套 memory/store。
2. **将原始培养意见与运行时能力分开**：现有 message-feedback 可作对具体答复的评价事实，不可直接喂成技能或授权；既有 journal/Session query 可供人或角色回查；人审提炼后再更新技能符合现有培养合同。
3. **建议优先探现成 Agent Team message 通道**，因为它表达 CEO↔成员协作且不把建议混同 permission approval。先证明冷成员、目标角色、回执及日志归属，再决定是否复用；`user-questions` 只用于 CEO 需要人作结构化决定，审批仅用于敏感动作放行。
4. **保持职责事实在现有单一来源**：公司手册由 agent-instructions 注入，稳定方法进角色 skill，历史运行事实留 Session/journal；不创建新的 scheduler、memory、feedback router 或持久个人档案服务，除非探针证伪既有载体可用且有明确 owner 与 ACL 缺口。

## 引用入口

- DSH pin 与只读政策：根 [`AGENTS.md`](../../../../AGENTS.md)；本轮实际 pin 查询如上。
- 现有培养合同：[`docs/presets.md`](../../../../docs/presets.md) §培养回路与学习载体；决定证据：[`notes/implemented/2026-09-24-twin-cultivation.md`](../../../../notes/implemented/2026-09-24-twin-cultivation.md)。
- Vendor mechanism: skill registry [`packages/skill/skill/src/index.ts`](../../../../vendor/dsh/packages/skill/skill/src/index.ts), filesystem provider [`packages/skill/skill-filesystem/src/index.ts`](../../../../vendor/dsh/packages/skill/skill-filesystem/src/index.ts), tool consumer [`packages/skill/tool-skill/README.md`](../../../../vendor/dsh/packages/skill/tool-skill/README.md), preset [`packages/preset/agent-preset-registry/README.md`](../../../../vendor/dsh/packages/preset/agent-preset-registry/README.md), feedback [`packages/feedback/message-feedback/README.md`](../../../../vendor/dsh/packages/feedback/message-feedback/README.md), session query [`packages/session-query/tool-session-query/README.md`](../../../../vendor/dsh/packages/experimental/tool-session-query/README.md), approval [`packages/interaction/user-approval/README.md`](../../../../vendor/dsh/packages/interaction/user-approval/README.md), user questions [`packages/interaction/user-questions/README.md`](../../../../vendor/dsh/packages/interaction/user-questions/README.md)。
