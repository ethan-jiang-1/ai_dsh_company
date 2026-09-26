# 文档地图、组织原则与决策台账

本目录是"虚拟公司多角色插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；决定、替代方案和验证证据归 `notes/`。`implemented/` 的实现事实仍维护，不是冻结历史；归档是按未来指导价值作出的另一次选择，不是必经下一站。

## 文档组织原则（为什么不是"初始化/"）

**docs/ 按"性质"分层，不按"时间"分层。** 时间维度的东西（初始意图、提案、已废方案）住
`notes/`：一份"初始化文档"要么始终为真（那它就是当前文档，按主题归位），要么已经失真
（那它是历史，归 notes/ 或交给 git）。按时间分目录必然长出"烂尾层"。

| 层 | 目录 | 性质 | 生命周期 |
|---|---|---|---|
| 导航 | 本文件 | 地图 + 台账 | 活（每决策/每新文档更新） |
| 设计 | `design/` | **为什么**：机制依据、方案取舍 | 稳定；被推翻时整个归档并在台账记 D 号 |
| 指南 | `guides/` | **怎么操作**：runbook、预算限流 | 活（随操作方式演进） |
| 合同 | 顶层（按主题） | **是什么**：某子系统现在时语义 | 随代码同 diff，只写 now |

## 文档地图

### 现有文档

| 文档 | 层 | 回答什么 |
|---|---|---|
| [design/architecture.md](./design/architecture.md) | 设计 | repo 形态与组合层（Option A + 单 pack）；角色=preset 纠偏；插件计数（**1 个包**）；四条协作通道；KB 三载体；目录树 |
| [design/roles-isolation.md](./design/roles-isolation.md) | 设计 | 每角色独立六面的机制安排；composition 继承分水岭与 `mount()` 裂缝；M1–M4 编排选型；两个诚实的缺口（§4） |
| [design/ui-demo.md](./design/ui-demo.md) | 设计 | Web UI 演示层：现成团队 UI（零代码）、公司皮肤（slots/Remote）、demo 分镜 |
| [design/role-content-plan.md](./design/role-content-plan.md) | 设计 | 角色内容设计（五角色 R2 定稿，现时语义见 [presets.md](./presets.md)）：persona 要素、skills 清单、KB/模板骨架、入戏探针 |
| [guides/budget-and-ops.md](./guides/budget-and-ops.md) | 指南 | 限流旋钮总表、成本结构、demo 运维 runbook（症状→动作）、回放复盘 |
| [guides/dev-loop.md](./guides/dev-loop.md) | 指南 | 开发操作手册：任务入口与授权（§0.5）、实施和证据交接（§1）；其余按改动面查调试、发布、双 home 等章节 |
| [profile.md](./profile.md) | 合同 | host 组合现在时：部署形状（源码直跑/持久安装实测）、行清单语义、开放点 |
| [delegation.md](./delegation.md) | 合同 | 汇报线现在时（R3 出生）：命名委托工具（one-shot 前台）与 team 的分工、team shadow 边界与证据、委派工具卡、分层验证 |
| [presets.md](./presets.md) | 合同 | 角色 preset 语义（R2：五角色定稿——CEO / VP-Eng / VP-Sales / COO / CFO）；名册运行时实测；验证分层 |
| [demo.md](./demo.md) | 合同 | demo 操作合同（R4 立场景 C，2026-09-25 补场景 D 季度经营会 / E 事件复盘）：动议、前置、分镜与观测点、验收判据（含**交付物三态**的机器判据）、已知边界 |
| [release.md](./release.md) | 合同 | 发布形状现在时（R5a 出生）：peers / 兼容矩阵 / 真实安装冒烟（release-smoke）/ 升 pin 程序（sync-dsh） |
| [multi-human.md](./multi-human.md) | 合同 | **多人协作现在时**（2026-09-26 出生）：机制边界（卡按会话作用域、成员拉不到人）/ 形态 / 开门 runbook / 协作前提三条 / 迁移清单 / 边界 |

### notes/（决策与教训，不进 docs）

| 位置 | 回答什么 |
|---|---|
| `notes/intents.md` → `notes/proposed/` → `notes/implemented/` | 一次决策的来龙去脉（含**实际跑过的验证 + 环境状态**）。**提案纪律**：`proposed/` 不是停车场——进它就必须在 [ROADMAP.md](../ROADMAP.md) 有归宿；条目全有归宿后**毕业**到 `implemented/`（毕业 ≠ 全部实现，而是"每一条都有归宿"）。两条机械门禁 `proposal-scheduled` / `proposal-graduated` |
| [notes/postmortem/](../notes/postmortem/README.md) | **事故复盘**：为什么流程放过了它 + 加了什么护栏（0001 preset 挂载失败、0002 团队 UI 不可见·根因误诊已更正、0003 重复挂载 remote 砖全 UI） |
| [notes/implemented/2026-09-22-agent-workflow-community-practice.md](../notes/implemented/2026-09-22-agent-workflow-community-practice.md) | 外部研究：代理工作流的社区/厂商一手证据（结论已吸纳为 D15，否决项也记在里面） |

### 合同落点（不为已有内容另建重复文件）

| 主题 | 当前事实家 |
|---|---|
| 文档卫生与开发流程 | 本文件的文档组织原则 + [开发环 §0.5/§1/§12](./guides/dev-loop.md) |
| 培养/学习回路 | [presets.md](./presets.md) 的培养回路与学习载体（D25） |

`delegation.md` 与 `release.md` 见上方地图；当前没有待另建的合同。

## 决策台账

### 决策记录（先辨当前适用范围）

D 号用于追溯，不表示所有旧句仍是当前指令。D5 为第 0 天历史；D10 的 plans 层已由 D24 退役；D11 的完整切片与窄验证仍可参考，轮次流程由 D23/D24 队列流程替代。队列条目默认新对话上下文接手是 D23 本仓适配。D19 的拆轮安排是历史，搁置池准入条件见 ROADMAP；D21 记录历史轮次安排。D13 的默认适配自由经 D23 收紧：遵循钉住的 DSH 纪律，本地差异按 D 号说明约束与证据。任务操作规则见[开发环 §0.5/§1/§12](./guides/dev-loop.md)。其他决定按对应 owner 与当前实现核对；冲突时查关联 Note 和窄证据。

| # | 决定 | 依据/出处 |
|---|---|---|
| D1 | **自写包 = 1 个**（company-pack）；行多包少，角色是 preset 目录不是包 | architecture §2；FAQ 13 决策 2 |
| D2 | 角色 = agent preset（persona row + 自有 skills/ + 角色工具行），共享行**随 pack 的 bundle 层**、preset 只放差异（R1 实证细化：profile 层 patch 只能替换不能新增，见 D12） | architecture §1/§6；cordis preset 两平面教义 |
| D3 | repo 形态 = FAQ 13 方案 A：独立 repo + `vendor/dsh` pinned submodule + 双 home | architecture §6；FAQ 13 |
| D4 | **demo 主通道 = Agent Teams（M4/通道 B）**；"事件从 CEO 进出"由 Lead-only 权威模型内建 | architecture §2.2 + plans/roadmap；用户 demo 需求 |
| D5 | 第 0 天零自定义 JS：纯配置 pack + 现成 team profile bundle 即可跑通 demo v0（注：R3 加 continuable 委托前，把 team 两包改为直插我们 profile 的行——bundle 会 disable 全局续驶控制，见 architecture §3 通道 A 冲突注） | architecture §2.1/§3；ui-demo §1 |
| D6 | UI 分层：第 0 层用现成 `client-ui-agent-team`；皮肤层进同一 pack 的 client 面（`dsh.client` + tsdown） | ui-demo §0/§2 |
| D7 | KB 三载体分层：产品化角色知识→preset skills；公司手册→全局/project root；活数据→workspace 文件 | architecture §5 |
| D8 | 跨会话角色记忆 = workspace journal 文件（`kb/<role>/journal/`） | roles-isolation §4.2 |
| D9 | 上游缺口（常驻对话+独立组合）若成刚需→走 FAQ 13 方案 B 提 seam（`ChildComposition` 加 preset 字段），不 vendor patch | roles-isolation §4.1 |
| D10 | **docs/ 按性质分层（导航/设计/计划/指南/合同），不按时间分层**；初始意图归 `notes/intents.md`（否决"初始化/"目录方案） | notes/implemented/2026-09-21-docs-layering.md |
| D11 | **迭代单位 = 垂直轮**：R1 最薄全路径（CEO+VP-Eng 两人公司）→ 逐轮加宽；交付按完整垂直切片、验证按最窄证据、打磨蛇形折回；现成团队 UI R1 作观察窗、R2 进验收，自定义皮肤 R5；每轮换全新对话上下文（交接靠 roadmap 两清单） | notes/implemented/2026-09-21-vertical-rounds.md；FAQ 13 dev-loop 第 4/6 阶段 |
| D12 | **patch 语义定案**（R1 实证）：`- id:` 只替换已有行（not found 即丢弃并警告）；**新增行必须 `- insert:` 子列表**；因此 host 行随 pack 的 bundle 走，且 `agent-presets` 行用**替换**语法覆盖 web-app 的出厂行（default: standard → ceo + 自定位 roots）；纯 headless 组合（无此行）用 `dev/company.overlay.yml` 的 insert 补 | notes/implemented/2026-09-22-r1-*.md；vendor shipped dsh-headless/dsh-web-app 的 cordis.patch.yml |
| D13 | **历史宣言：开发纪律沿用 DSH**（当时写作“整套继承 + 按规模裁剪、不发明本地流程”）。该默认适配自由已由 D23 限定：默认遵循钉住的 vendor 纪律，偏离须登记 D 号与约束证据；当前 owner 见 AGENTS.md §纪律及开发环 §12 | [D23 转型 Note](../notes/implemented/2026-09-23-dsh-inround-task-surface.md)；用户决定 |
| D14 | **公司名 = wochen；角色显示名系列化** `<公司名> <角色>`（`wochen CEO` 等）；**preset id 保持 kebab 不变**（`ceo`/`vp-eng`/`vp-sales`/`coo`——id 受 `PRESET_ID=/^[a-z0-9][a-z0-9-]*$/` 限制，不能带下划线/大写）；角色层级不动（CEO 是个体、VP 是职能，见 role-content-plan §0.1） | notes/implemented/2026-09-22-wochen-naming.md；role-content-plan §1 |
| D15 | **完成定义 = 该面最小"真检查"通过；发现权在代理一侧，不在人**。迭代是常态，但必须由**代理能自己跑的检查**闭合：真入口路径 > dump/扫描；"伺服了"≠"能加载"；让用户看 UI 之前必须先机器验证过。**同时否决**：为这类失败引入 spec 流程（无第一方证据，且本类失败不在其射程）、把指令文件写更长（advisory，非确定性） | notes/implemented/2026-09-22-agent-workflow-community-practice.md（17 个一手来源）；notes/postmortem/0001-0002；vendor `docs/testing.md` + `docs/postmortem/0003-web-agent-gui-feedback-loop.md`；落点：guides/dev-loop §1/§2/§7、AGENTS.md 纪律表 |
| D16 | **Q2 定案（2026-09-22）**：角色模型路由 = R2 全员同模型（默认路由，不写 `agentOptions`）。理由：当前瓶颈是内容质量与协作可见性，成本无差异化证据；需要差异路由时 R3 在委托工具 `agentOptions` 层做，不动 persona | tests/presets.spec.ts；presets.md |
| D17 | **Q3 定案（2026-09-22）**：公司事实（CHARTER / journal / 客户 / 预算基准）全部留 workspace 活数据（D7 三载体）；随 pack 发布的只有方法论 skills 与结构模板——pack 不含公司事实，换公司复用 = 只换 workspace | presets.md；company-workspace/kb/ |
| D18 | **R3 汇报线定案（2026-09-22）**：CEO 的命名委托工具 `vp_eng` / `vp_sales` = **one-shot 前台**（`backgroundMode: one-shot` + `enableRunInBackground: false` + `maxDepth: 1` + per-instance persona）。**continuable 在本组合里不可用**：CEO 会话从**第一帧**起 team-scoped，团队版 `send_message` / `list_agents` / `interrupt_agent` 按成员**名字**寻址，而 subagent child 不在名册上 ⇒ 续驶/中断/列举全不可达。因此：续驶与连续对话归 **team（M4）**；"child 拿到角色完整 skills/工具面"归 **M2（未做）**；CEO preset **不放**全局控制行（在 CEO 会话是死行，有反向守卫）；并行快捷派活要等上游 seam，**本仓不自建**（D13） | [delegation.md](./delegation.md)；`scripts/delegation-smoke.mjs`（边界守卫）；`snapshots/r2-motion/sessions/lead.jsonl` 第一帧 |
| D19 | **R5 拆轮 + 搁置池（2026-09-22）**：① **R5 → R5a 门禁与发布 / R5b 驾驶舱**——同轮塞 4–5 个面时，最不确定的 replay harness 会卡住皮肤交付（D11：一轮一份可观察的外部行为）；② **进搁置池须满足"缺上游 seam"或"缺明确需求"**，被否决的方案不进池（归 D 号 / 复盘 / 各 Note 的「输掉的方案」节——不设 `rejected/` 目录，2026-09-25 裁断），复活条件写进池内每行；首批四条 = 自主节律 / 并行快捷派活 / M2 / 界面外推送；③ R6 的"两条接线 + U1"阻塞经核实**已清**，只余一次活体探针（轮间待办 R5a → R6） | [ROADMAP.md](../ROADMAP.md) §搁置池（原 r5-plus-readiness.md 已于 R6 删除；当年那份「腐化点清单」随 ROADMAP 历史段于 2026-09-26 一并删除，全文在 git `d159b0228e2b`） |
| D20 | **交付物三态判据（R4，2026-09-22）**：① **成品 = Lead 会话的 `present`**（`agentPreset=ceo` 且 `delegationDepth=0`）——依据是公司手册的承诺权，且实测 R2 里 CFO 也 `present` 过 3 次，不限归属则过程稿与定稿平级、仍答不上"哪些是成品"；② **按交付物身份（`slug` + 角色）比对，不按字面路径**——给三态迁移留桥，否则迁移一次就把历史证据全判成 dangling（假阳性，不是违规）；③ **反向检查只追 Lead 声明**，非 Lead 的成品声明只在它**此刻真躺在盘上**时判越权（历史行为不追着报，否则一次越权永久污染此后每轮审计）。实现 `scripts/lib/deliverables.mjs` + 入口 `scripts/deliverables-check.mjs`（**审归档快照须配 `--only <slug>`**，因快照是整盘 workspace + 本轮日志）；合同家 = `company-workspace/AGENTS.md`「交付物三态」 | [implemented/2026-09-22-r4-workshop-flow.md](../notes/implemented/2026-09-22-r4-workshop-flow.md) |
| D21 | **历史轮次调整（2026-09-23，用户决定）**：R6 用于内容诊治，分身成长改号 R7；轮次制随后由 D23/D24 退役。原范围、审计证据与映射只在各自收尾 Note 保留，不把已退役的轮次搬入当前任务队列 | [implemented/2026-09-23-r6-content-remediation.md](../notes/implemented/2026-09-23-r6-content-remediation.md)；[D23 转型 Note](../notes/implemented/2026-09-23-dsh-inround-task-surface.md) |
| D22 | **R5b 驾驶舱定案（2026-09-23，Q5–Q8）**：① **在场板主键 = team roster**——"会话 × preset"被 r2/r3 两份录制**证伪**（child 的 `agentPreset` 恒为发起者 `ceo`、`agent-preset/selected` 事件合计 0 条，四个分身不可辨）；lead 行即 CEO（`roster.list()` 恒置顶 `role:'lead'`），不另开"公司级"视图；不在 team 里的会话不进场板（可见性归 lineage/侧栏）。② **冷启动 = 拉式 RPC `remote.agentTeams.view(lead)`**——挂载即拉 + 5s 轮询，不订阅 `session/event`、不需要 `sessionQuery`（原两路合并的问题设定整个消解）；durable team 态由 lead 日志事件重建，live 缺席 → `inactive` 非行消失。③ **status 文案 = 中文映射 + 团队限定**（执行中/待命/未上线/启动中/故障）。④ **成员空间入口 = 在场板行可点**（照官方 `openTeammate`；`openSubagent` 寻址按父会话 catalog，one-shot/continuable 都在，对非 team child 亦可达）。同轮：r2-motion replay 场景出生 + replay-smoke 泛化多 child + **presence 判据档**（历史录制全量零 diff 必然红——内容演进 ≠ 重放缺陷；member/task 集合等价 + 在场板同形替代）；消息级动态流进搁置池（stub codegen 归 vendor 管线，host 投影通道已核实）。定案与证据全文 = [implemented/org-presence-board §四个定案](../notes/implemented/2026-09-22-org-presence-board.md)；收尾 = [implemented/2026-09-23-r5b-cockpit](../notes/implemented/2026-09-23-r5b-cockpit.md) | [implemented/2026-09-23-r5b-cockpit.md](../notes/implemented/2026-09-23-r5b-cockpit.md)；[ROADMAP.md](../ROADMAP.md) R5b 行 |
| D23 | **开发流改为条目制（2026-09-23）**：轮次流程退役；队列条目默认新上下文接手（本仓适配）。当前授权、Plan Mode 与反馈面规则唯一见[开发环 §0.5/§1](./guides/dev-loop.md)。 | [转型与依据](../notes/implemented/2026-09-23-dsh-inround-task-surface.md) |
| D24 | **队列 owner = 根部 `ROADMAP.md`（2026-09-23）**：`plans/` 退役；AGENTS.md 存常设路由，ROADMAP 只调度活动/暂停项，完成即离队，决定与证据留 Note。当前规则见 ROADMAP 文件头。 | [转型依据](../notes/implemented/2026-09-23-dsh-inround-task-surface.md) |
| D25 | **培养/学习回路定案（2026-09-24，分身成长条目）**：培养 = 改 `presets/<role>/`（persona row + skills），培养权 = repo 写权限（无原生授权动作）；**生效边界按面**——persona / 组合文件 = 新会话（vendor stamp 机制），**skill 正文 = 同会话下一轮**（活体实证**修正 U1 旧结论**"只有新会话变"：U1 量模型转述、本轮量日志工具结果，与 vendor"每次 get() 读盘"一致；证据 = 收尾 Note ③）；培养验收 = `verify` + `test` + `preset-smoke` + `probe --full` 四绿。学习 = journal 唯一载体（D8）+ **人审提升**（照 DSH `human-review-skill-maintenance`：只采纳有证据的、不自动提升、单人 bus factor 在案；提升文本只写方法论，D17）；否决分身自改 skill（隔离后为机制事实）；自主节律住搁置池 | [implemented/2026-09-24-twin-cultivation.md](../notes/implemented/2026-09-24-twin-cultivation.md)；[implemented/2026-09-22-digital-twin §6](../notes/implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md) |
| D26 | **文档卫生按指导价值取舍（2026-09-24）**：移除“每次净减文件/行数”和固定删并修记顺序；优先处理重复/失效指令与活指针，保留仍指导未来决策的理由、反例和重启条件；文件/行数仅观察，不是完成门槛 | 本轮 [基石整治 Note](../notes/implemented/2026-09-24-foundation-remediation.md) §决定；用户确认 2026-09-24 |
| D27 | **升 pin 程序偏离官方事务（2026-09-25，登记偏离）**：官方 `sync-dsh --pin` 第③步要求 vendor 自建，而 `pnpm --dir vendor/dsh run build` 在本仓**嵌套工作区**里必失败（独立 staging 树可构建）⇒ 本仓改为**手工簿记 + 门禁留证**（`vendor-pin`/`vendor-clean`/`pack-compat` 三道）。长期解（嵌套工作区里跑 vendor 自建）未做 | [implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md](../notes/implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md) §登记偏离 |
| D28 | **枚举型事实的家 = 实现自己，不在文档里复述**（2026-09-26，技术债清扫定）：同一批事实（脚本触发条件与成本、门禁清单、pin 版本、清单类枚举）在文档里复述必漂——实测六份清单同一种病（dev-loop §9.1 漏 6 个已存在脚本、AGENTS 两份门禁清单互不一致、pin 五处拷贝）。改为：**事实的家紧挨实现**（脚本头注 `// 何时跑：`、`verify.mjs` 的 `expectedTag`、`DOC_LINE_BUDGETS`），文档只留**分层原则 + 指针**；机械可查的用门禁强制（`script-triggers` / `pin-currency` / `pin-bookkeeping`）。**新写文档时先问：这条事实的家是不是代码／脚本自己** | [implemented/entry-execution-chain-debt](../notes/implemented/2026-09-26-entry-execution-chain-debt.md) §交付实况 |

### 待定与活动提案

旧问题 Q1–Q8 均已闭合（Q1→D18、Q2→D16、Q3→D17、Q4 于 2026-09-22 定案、Q5–Q8→D22）。这只结算该组问题；当前待人裁或待触发的项目见 [ROADMAP.md](../ROADMAP.md) §队列与 §搁置池（条目名不在此复述——复述会过期，2026-09-24 探针实证）。

## 文档路由

本表说明主题事实的 owner，不代表该面在当前提交经过完整覆盖或认证；验证状态与缺口见各合同及相关 Note。

| 面 | 事实家 / 导航 |
|---|---|
| 机制（组合/隔离/协作/UI 扩展点） | design/architecture + design/roles-isolation + design/ui-demo；源码与运行结论按对应合同核对 |
| 内容（persona/skills/KB/模板） | design/role-content-plan + presets.md + `company-workspace/kb/` + `company-workspace/AGENTS.md` |
| 运营（预算限流/runbook/回放） | guides/budget-and-ops |
| 流程（Notes、门禁及开发环） | guides/dev-loop + `notes/` + `scripts/verify.mjs` |

## 外部研究材料登记（repo 外，只读引用）

本 repo 的形态与机制结论大量借鉴三处 repo 外材料（均在 `/Users/bowhead/deepseek-harness/`
工作树内、已被该 repo 的 git 跟踪；不在本 repo 版本控制范围，引用时注明是外部研究材料）：
`_faq_on_digested/`、`_digested/`、`_agent_ready_development/`（后者 = Agent-ready Development 语料，
第三视角"Development Harness"专题；已逐篇对照完毕——判定台账见下表该行）。
该研究树 HEAD 在钉住 tag 之后 199 个提交（本地 FAQ/docs 工作，`dsh-v0.1.7-rc.1-199-g5c3af9b21b`，2026-09-25 复核），
`_digested` 的审计基线仍为 rc.2——引外部笔记时以基线对齐，不追研究树新提交。
**思想吸收进本 repo 文档后，日常不再依赖原文**；下表是"哪个想法落在了哪儿"的地图：

| 材料 | 内容 | 吸收落点 |
|---|---|---|
| `_faq_on_digested/13_expert-plugin-repo-organization/answer.md` | 五决策框架（入口形态/包粒度/DSH 源码位置/UI 层/spec 流程） | D1–D3、D6；design/architecture §0–§2、§9 |
| `…/option-a-standalone-with-pinned-dsh.md` | **本 repo 形态依据（Option A）**：目录树、装法、取舍、升级阶梯 | design/architecture §6（目录树）、§8–§9；AGENTS.md 布局/簿记 |
| `…/dev-loop.md` | 开发过程生命周期（六步闭环/调试阶梯/设计四问/插拔速查） | guides/dev-loop（全文吸收）；AGENTS.md 纪律 |
| `…/dual-home-isolation.md` | 双 home 机制、崩溃半径、迁移方向 | dev/env.sh；guides/dev-loop §6 |
| `…/research.md` | 第三方生态证据（peers/兼容矩阵/自包含/真实安装形状） | guides/dev-loop §5 发布纪律时点；design/architecture §8 |
| `_digested/`（源码消化笔记） | DSH 源码机制笔记（= vendor 钉住 tag 的审计基线，版本唯一见 `AGENTS.md` §vendor 簿记） | design/ 各篇（architecture / roles-isolation / ui-demo）的机制核对引文；**权威仍在 `vendor/dsh/` 本体** |
| `_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md` | DSH Agent Note 生命周期（状态/路径/格式/取代/归档；基于上游 0.1.7-rc.1 树） | guides/dev-loop §12 Note 生命周期细则 + [implemented/notes-lifecycle-absorption](../notes/implemented/2026-09-24-notes-lifecycle-absorption.md)（2026-09-24 点选吸纳六条） |
| `_agent_ready_development/`（三卷 + `_coverage` + `verify.mjs`） | Agent-ready Development 语料：SDLC 主线 / 精确参考 / **Development Harness（仓库怎样让 agent 看懂、修改、验证自己）**；钉 DSH commit `46a7f68b`（tag `dsh-v0.1.7-rc.1`），自带结构门禁 | 对照台账 = [research/harness-alignment-ledger](../notes/research/2026-09-25-harness-alignment-ledger.md)（27 篇判定零待定：9 已对齐 / 采纳三切片已落地 / 其余不适用+触发条件；**不照搬清单在其 §四.4**）；已吸纳页见上行 |
| 人机交互 UX 研究来源集（Temporal/Claude Code/Warp/GitHub/PagerDuty/Slack/Horvitz 等） | 阶段 0 外部实践研究的引用全集与逐条判定 = [research/human-agent-ux-patterns](../notes/research/2026-09-25-human-agent-ux-patterns.md)（外部资料只作数据；Horvitz 两篇 PDF 未逐字核） | 人机合一条目的 A2/B 切片依据 |

## 术语映射（本项目用法 ↔ DSH 官方 ↔ vendor/dsh 源码直达）

新会话查 DSH 机制先查这张表：概念 → 官方载体 → 源码路径一步到位（路径均核实存在于钉住 tag）。
探索路由（进 vendor 树）：`vendor/dsh/docs/architecture.md` → `docs/capability-seams.md` → 具体
package README——机制结论的权威在 vendor 树。

| 本项目 | DSH 官方 | vendor/dsh 落点（读源码从这进） |
|---|---|---|
| 角色（CEO/VP…） | agent preset（`presets/<id>/agent.cordis.yml` + persona + skills） | `packages/preset/agent-preset`（每预设一行声明，rc.2 形）+ `packages/preset/persona`；出厂范本 = `packages/bundle/web-app/presets/` |
| 组织/公司 | 一个 host profile + preset roster（rc.2：`agent-preset-registry` 装配，roots 目录扫描已废） | `packages/preset/agent-preset-registry`（default 装配）+ `docs/architecture.md`（组合链）；升 pin迁移实证 = [pin-upgrade](../notes/implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md) |
| worker（角色底下干活的一次性代理） | one-shot subagent（`dsh-tool-subagent`，spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 派活/汇报线 | 命名委托工具（通道 A / M2） | 同上（per-instance persona 教义在其 README） |
| 会议/任务板/邮箱 | Agent Teams（`ctx.agentTeams`，experimental） | `packages/experimental/agent-team` + `packages/experimental/tool-agent-team` + `docs/subsystems/agent-team.md` |
| 通道 A/B/C/D（机制） | 命名委托 / Agent Teams / dsh-sdk 子进程 / workflow 脚本（architecture §3） | [architecture.md](./design/architecture.md) §3 篇首映射表（各通道包清单） |
| M1–M4（用法/编排） | 人中继 / 隔离委托 / SDK 编排器 / 团队（roles-isolation §3） | [roles-isolation.md](./design/roles-isolation.md) §3 选型速查 |
| 公司页签 / 公司视图 | 右栏五个平台页签（看板/依赖图/在场/用量/任务板，可 `float()` 拖出成浮窗）+ 整页视图（`conversation.view` 条目；命名表 = ui-demo §5） | `packages/client/ui-sidebar-right`（tab 注册与浮窗）+ `docs/subsystems/sidebar-right.md` + `packages/client/ui-dockkit`（浮窗手势） |
| 交付物 | `present` 工具的 explicit deliveries（ui-demo §1） | `packages/client/ui-deliverables` |
