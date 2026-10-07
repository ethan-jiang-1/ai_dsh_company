# 文档地图、组织原则与决策台账

本目录是"虚拟公司多角色插件"项目的文档层。什么时候读 = 找某主题的事实家、查决策台账、或不确定该信哪份文档时（驾驭者白话速读 = [orient.md](./orient.md)）。性质：**当前合同 + 设计依据**——只写 now、随代码同 diff；决定、替代方案与验证证据归 `notes/`（`implemented/` 实现事实仍维护——归档是按未来指导价值的另一次选择，不是必经下一站）。

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

项目运行、目录、调试和测试导航见 [project-map.md](./project-map.md)；驾驭者白话五问见 [orient.md](./orient.md)；脚本用途索引见 [checks/README.md](../checks/README.md)，触发条件与成本以脚本头注为准。

### 现有文档

| 文档 | 层 | 回答什么 |
|---|---|---|
| [design/architecture.md](./design/architecture.md) | 设计 | repo 形态与组合层（Option A + 单 pack）；角色=preset 纠偏；插件计数（**1 个包**）；四条协作通道；KB 三载体；目录树 |
| [design/roles-isolation.md](./design/roles-isolation.md) | 设计 | 每角色独立六面的机制安排；composition 继承分水岭与 `mount()` 裂缝；M1–M4 编排选型；两个诚实的缺口（§4） |
| [design/ui-demo.md](./design/ui-demo.md) | 设计 | Web UI 演示层：现成团队 UI（零代码）、公司皮肤（slots/Remote）、demo 分镜 |
| [design/role-content-plan.md](./design/role-content-plan.md) | 设计 | 角色内容设计（五角色 R2 定稿，现时语义见 [presets.md](./presets.md)）：persona 要素、skills 清单、KB/模板骨架、入戏探针 |
| [guides/budget-and-ops.md](./guides/budget-and-ops.md) | 指南 | 限流旋钮总表、成本结构、demo 运维 runbook（症状→动作）、回放复盘 |
| [guides/dev-loop.md](./guides/dev-loop.md) | 指南 | 开发操作手册：任务入口与授权（§0.5）、实施和证据交接（§1）；其余按改动面查调试、发布、双 home 等章节 |
| [guides/bootstrap.md](./guides/bootstrap.md) | 指南 | 冷启动引导（clean checkout → 可跑通）：配方、双面构建与实证坑（2026-09-27 自 dev-loop §7 迁入） |
| [profile.md](./profile.md) | 合同 | host 组合现在时：部署形状（源码直跑/持久安装实测）、行清单语义、开放点 |
| [delegation.md](./delegation.md) | 合同 | 汇报线现在时（R3 出生）：命名委托工具（one-shot 前台）与 team 的分工、team shadow 边界与证据、委派工具卡、分层验证 |
| [presets.md](./presets.md) | 合同 | 角色 preset 语义（R2：五角色定稿——CEO / VP-Eng / VP-Sales / COO / CFO）；名册运行时实测；验证分层；培养回路与学习载体（D25） |
| [demo.md](./demo.md) | 合同 | demo 操作合同（R4 立场景 C，2026-09-25 补场景 D 季度经营会 / E 事件复盘）：动议、前置、分镜与观测点、验收判据（含**交付物三态**的机器判据）、已知边界 |
| [release.md](./release.md) | 合同 | 发布形状现在时（R5a 出生）：peers / 兼容矩阵 / 真实安装冒烟（release-smoke）/ 升 pin 程序（sync-dsh） |
| [testing.md](./testing.md) | 合同 | **测试宪法**（2026-10-04 立）：什么算证据——分层与证明边界、改动面→最小证据、证据纪律、资产三分法、自测轮授权、已知未覆盖面与升级地图 |
| [multi-human.md](./multi-human.md) | 合同 | **多人协作现在时**（2026-09-26 出生）：机制边界（卡按会话作用域、成员拉不到人）/ 形态 / 开门 runbook / 协作前提三条 / 迁移清单 / 边界 |

### notes/（决策与教训，不进 docs）

| 位置 | 回答什么 |
|---|---|
| `notes/proposed/` → `notes/implemented/` | 一次决策的来龙去脉（含**实际跑过的验证 + 环境状态**；授权链线索记在 Note 状态行——intents.md 已退役，D34）。**提案纪律**：`proposed/` 不是停车场——进它就必须在状态行带「批准：」标记（`proposal-scheduled` 门禁查；未批准的思考住 `_backlog/plans/` 推敲卡）；条目全有归宿后**毕业**到 `implemented/`（毕业 ≠ 全部实现，而是"每一条都有归宿"）。两条机械门禁 `proposal-scheduled` / `proposal-graduated`。**未成熟思考的上游 = `_backlog/plans/` 推敲卡（D31）**：毕业四门见 `_backlog/README.md` |
| [notes/archived/](../notes/archived/) · [notes/rejected/](../notes/rejected/) | **研究层离场两桶（D30，出口随 D31 保留）**：archived = 完结且仍被引用的研究（实验记录/评审/调研/台账，可读可引但不在工作集）；rejected = 过时/被推翻的研究（负知识防复犯）。不设回收站语义（git 即归档） |
| [notes/postmortem/](../notes/postmortem/README.md) | **事故复盘**：为什么流程放过了它 + 加了什么护栏（0001 preset 挂载失败、0002 团队 UI 不可见·根因误诊已更正、0003 重复挂载 remote 砖全 UI） |
| [notes/implemented/2026-09-22-agent-workflow-community-practice.md](../notes/implemented/2026-09-22-agent-workflow-community-practice.md) | 外部研究：代理工作流的社区/厂商一手证据（结论已吸纳为 D15，否决项也记在里面） |

## 决策台账

### 决策记录（先辨当前适用范围）

D 号用于追溯，不表示所有旧句仍是当前指令。D5 为第 0 天历史；D10 的 plans 层已由 D24 退役；D11 的完整切片与窄验证仍可参考，轮次流程由 D23/D24 队列流程替代。队列条目默认新对话上下文接手是 D23 本仓适配。D19 的拆轮安排是历史（搁置池已随 D32 整层退役，归档 `_backlog/_done/_misc/`）；D21 记录历史轮次安排。D13 的默认适配自由经 D23 收紧：遵循钉住的 DSH 纪律，本地差异按 D 号说明约束与证据。任务操作规则见[开发环 §0.5/§1](./guides/dev-loop.md)。其他决定按对应 owner 与当前实现核对；冲突时查关联 Note 和窄证据。

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
| D10 | **docs/ 按性质分层（导航/设计/计划/指南/合同），不按时间分层**；初始意图归 intents 登记表（该表已由 D34 退役；否决"初始化/"目录方案） | notes/implemented/2026-09-21-docs-layering.md |
| D11 | **迭代单位 = 垂直轮**：R1 最薄全路径（CEO+VP-Eng 两人公司）→ 逐轮加宽；交付按完整垂直切片、验证按最窄证据、打磨蛇形折回；现成团队 UI R1 作观察窗、R2 进验收，自定义皮肤 R5；每轮换全新对话上下文（交接靠 roadmap 两清单） | notes/implemented/2026-09-21-vertical-rounds.md；FAQ 13 dev-loop 第 4/6 阶段 |
| D12 | **patch 语义定案**（R1 实证）：`- id:` 只替换已有行（not found 即丢弃并警告）；**新增行必须 `- insert:` 子列表**；因此 host 行随 pack 的 bundle 走，且 `agent-presets` 行用**替换**语法覆盖 web-app 的出厂行（default: standard → ceo + 自定位 roots）；纯 headless 组合（无此行）用 `run/company.overlay.yml` 的 insert 补 | notes/implemented/2026-09-22-r1-*.md；vendor shipped dsh-headless/dsh-web-app 的 cordis.patch.yml |
| D13 | **历史宣言：开发纪律沿用 DSH**（当时写作“整套继承 + 按规模裁剪、不发明本地流程”）。该默认适配自由已由 D23 限定：默认遵循钉住的 vendor 纪律，偏离须登记 D 号与约束证据；当前 owner 见 AGENTS.md §纪律及开发环 §12 | [D23 转型 Note](../notes/implemented/2026-09-23-dsh-inround-task-surface.md)；用户决定 |
| D14 | **公司名 = wochen；角色显示名系列化** `<公司名> <角色>`（`wochen CEO` 等）；**preset id 保持 kebab 不变**（`ceo`/`vp-eng`/`vp-sales`/`coo`——id 受 `PRESET_ID=/^[a-z0-9][a-z0-9-]*$/` 限制，不能带下划线/大写）；角色层级不动（CEO 是个体、VP 是职能，见 role-content-plan §0.1） | notes/implemented/2026-09-22-wochen-naming.md；role-content-plan §1 |
| D15 | **完成定义 = 该面最小"真检查"通过；发现权在代理一侧，不在人**：真入口路径 > dump/扫描；"伺服了"≠"能加载"；给人看 UI 前先机器验证。**同时否决**：为此引入 spec 流程、把指令文件写更长 | notes/implemented/2026-09-22-agent-workflow-community-practice.md（17 个一手来源）；vendor `docs/testing.md` + postmortem 0001–0003；落点：guides/dev-loop §1/§2 + guides/bootstrap、AGENTS.md 纪律表 |
| D16 | **Q2 定案（2026-09-22）**：角色模型路由 = R2 全员同模型（默认路由，不写 `agentOptions`）。理由：当前瓶颈是内容质量与协作可见性，成本无差异化证据；需要差异路由时 R3 在委托工具 `agentOptions` 层做，不动 persona | tests/presets/presets.spec.ts；presets.md |
| D17 | **Q3 定案（2026-09-22）**：公司事实（CHARTER / journal / 客户 / 预算基准）全部留 workspace 活数据（D7 三载体）；随 pack 发布的只有方法论 skills 与结构模板——pack 不含公司事实，换公司复用 = 只换 workspace | presets.md；company-workspace/kb/ |
| D18 | **R3 汇报线（2026-09-22）**：CEO 命名委托工具 = **one-shot 前台**；continuable 在本组合不可用（child 不在 team 名册，续驶/中断/列举不可达）⇒ 续驶归 team（M4）；CEO preset 不放全局控制行（有反向守卫）；并行派活等上游 seam（不自建，D13） | [delegation.md](./delegation.md) 全文；`checks/smoke/delegation-smoke.mjs`（守卫）；`snapshots/replay/r2-motion/sessions/lead.jsonl` 第一帧 |
| D19+D21 | **R5 拆轮（R5a 门禁/R5b 驾驶舱）+ 搁置池准入（缺上游 seam 或缺明确需求才进池，复活条件写进池内每行；被否决方案不进池）+ 轮次调整**——轮次制均已由 D23/D24 退役，细节只作历史（原 r5-plus-readiness.md 已删，全文在 git `d159b0228e2b`） | 搁置池表现居 [_backlog/_done/_misc/suspended.md](../_backlog/_done/_misc/suspended.md)（D32 迁入，2026-09-28 整池退役）；[r6-content-remediation](../notes/implemented/2026-09-23-r6-content-remediation.md) |
| D20 | **交付物三态判据（R4）**：成品 = Lead 的 `present`（`agentPreset=ceo` 且 depth=0）；比对按 `slug`+角色身份不按路径（桥 = 身份比对 + slug 剥日期前缀归一，2026-10-03 起覆盖改名与归档根）；反向检查只追 Lead 声明、非 Lead 只查此刻在盘。实现 = `tools/lib/deliverables.mjs` + `deliverables-check`（审快照配 `--only <slug>`）；合同家 = 公司手册「交付物三态」 | [r4-workshop-flow](../notes/implemented/2026-09-22-r4-workshop-flow.md) 全文 |
| D22 | **R5b 驾驶舱（2026-09-23，Q5–Q8 四定案）**：在场板主键 = team roster（"会话×preset"被 r2/r3 录制证伪）；冷启动 = 拉式 RPC `remote.agentTeams.view(lead)` + 5s 轮询；status 中文映射；成员入口照官方 openTeammate。同轮 r2-motion replay 场景出生 + presence 判据档 | [org-presence-board §四个定案](../notes/implemented/2026-09-22-org-presence-board.md)；[r5b-cockpit](../notes/implemented/2026-09-23-r5b-cockpit.md) |
| D23+D24 | **开发流条目制 + 队列 owner = 根部 `ROADMAP.md`（2026-09-23）**：轮次流程与 `plans/` 退役；AGENTS 存常设路由，ROADMAP 只调度、完成即离队、证据留 Note；队列条目默认新对话上下文接手。授权 / Plan Mode 规则唯一见[开发环 §0.5/§1](./guides/dev-loop.md)。**D32 退役**：队列层删除，职能去向见 D32 行 | [转型与依据](../notes/implemented/2026-09-23-dsh-inround-task-surface.md) |
| D25 | **培养/学习回路（2026-09-24）**：培养 = 改 `presets/<role>/`（生效边界按面：persona / 组合文件 = 新会话，skill 正文 = 同会话下一轮——活体实证修正 U1 旧结论）；验收四绿（verify/test/preset-smoke/probe --full）。学习 = journal 唯一载体（D8）+ 人审提升；否决分身自改 skill | [twin-cultivation](../notes/implemented/2026-09-24-twin-cultivation.md) 全文（含 U1 修正证据）；[digital-twin §6](../notes/implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md) |
| D26 | **文档卫生按指导价值取舍（2026-09-24）**：移除“每次净减文件/行数”和固定删并修记顺序；优先处理重复/失效指令与活指针，保留仍指导未来决策的理由、反例和重启条件；文件/行数仅观察，不是完成门槛 | 本轮 [基石整治 Note](../notes/implemented/2026-09-24-foundation-remediation.md) §决定；用户确认 2026-09-24 |
| D27 | **升 pin 程序偏离官方事务（2026-09-25，登记偏离）**：官方 `sync-dsh --pin` 第③步要求 vendor 自建，而 `pnpm --dir vendor/dsh run build` 在本仓**嵌套工作区**里必失败（独立 staging 树可构建）⇒ 本仓改为**手工簿记 + 门禁留证**（`vendor-pin`/`vendor-clean`/`pack-compat` 三道）。长期解（嵌套工作区里跑 vendor 自建）未做 | [implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md](../notes/implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md) §登记偏离 |
| D28 | **枚举型事实的家 = 实现自己**（2026-09-26）：脚本触发条件、门禁清单、pin 版本这类枚举在文档里复述必漂（实测六份清单同一种病）；家 = 脚本头注「何时跑」/ `run-gates.mjs` 的 expectedTag 与 `DOC_LINE_BUDGETS`，文档只留分层原则 + 指针，门禁强制 | [entry-execution-chain-debt](../notes/implemented/2026-09-26-entry-execution-chain-debt.md) |
| D29 | **自主优先协议**（2026-09-26，用户令，同日两轮细化）：① 尽量遵循 DSH 研发流程（D13/D23）；② 自主解决问题——动手发明前先探索、借鉴**成熟 DSH 插件**（下载量 / 影响力门槛）的既有思想，探索产物按 research 层生命周期落盘；③ REVIEW 分级——能自主审的自主审（独立盲审 / 中立体清扫 / code-review），阶段收口、不得不人审时才人审，人审形状 = 跑起来的实例 + 单页走查单 + 一次一件事 + 收尾留动作（「你去体验一下」类无落点请求 = 违规） | [guides/dev-loop §13](./guides/dev-loop.md)；AGENTS §本仓原生纪律 |
| D30 | **research 层三态模型**（2026-09-26，用户令，修订 09-25「不开 archived/rejected」裁断）：`research/` 只放未完结研究（TODO 语义，每份自带喂给谁/毕业动作为户口）；研究落地即离场——完结迁 `notes/archived/`、过时/被推翻迁 `notes/rejected/`；无人引用的死稿删除（git 即归档）。起因 = 用户指认「research 挂一堆东西」+「完结的不该在 TODO 里」。**D31 修订**：research 目录退役并入 `_backlog/plans/`，三态出口保留；**D33 起**研究原材料另立 [`_backlog/reference/`](../_backlog/reference/README.md) 堆（调研卡仍住 plans） | [guides/dev-loop §12](./guides/dev-loop.md)；**D31 修订后索引随目录退役**（git 留史） |
| D31 | **推敲空间 `_backlog/` + research 并入**（2026-09-28，用户令）：借外部仓 ai_deerflow_deep_research_v2 的 `_backlog` 三件——plans 推敲卡 / bugs 缺陷卡 / _done（位置即状态），补上「该不该做 / 何时 / 次序 / 是否放弃」四问成熟前的家；红线 = **只承载判断材料，不承载次序与授权**（D23 plans 层教训）；research 目录退役并入 plans（调研卡 = 卡性质，D30 三态出口保留）；门禁 research-liveness → plans-liveness。**D33 回借**：章制 2026-10-03 自 ai_dsh_loop_advisor 升级（主干框架/章程账本二分/索引交叉核对门禁/两桶解禁/全日期卡名） | [_backlog/README.md](../_backlog/README.md)；[implemented/2026-09-28-backlog-deliberation-space](../notes/implemented/2026-09-28-backlog-deliberation-space.md) |
| D32 | **队列层退役（2026-09-28，用户令「ROADMAP 痕迹彻底清理」）**：ROADMAP.md 删除（末次全文 commit `5018118`）；职能去向 = 实施次序→用户逐条给、在办→会话 goal/用户指令、已批→RFC 状态行「批准：」标记（proposal-scheduled 改查它，反证已证）、搁置池/磨清单→`_backlog/_done/_misc/`（同日二次归档；初迁 `_backlog/suspended.md` 已由 intents D32 行声明作废）；毕业四门、入口链（dev-loop §0.5 分支②、entry-probe Q1/Q2/Q6/Q9/Q11）、md-links 扫描面同步重接；历史层（intents/snapshots/旧 Note）按"当时事实"保留 | [implemented/2026-09-28-roadmap-retirement](../notes/implemented/2026-09-28-roadmap-retirement.md)（含**保留 ROADMAP 的反方论据全文**——用户裁决前的 dissent 留档） |
| D33 | **`_backlog` 章制回借（2026-10-03，用户令「从 ai_dsh_loop_advisor/_backlog 学习整理」）**：本仓送出去的制度在外面进化一代后借回——主干框架（缓冲→加工→回流）+ 三硬规则 + 反双记账合成规则 + 章程/账本二分入章程；门禁 plans-liveness → **backlog-liveness**（+制度目录在场 + 索引交叉核对；升格依据 = 本轮实测活违规两处）；`_suspended_*`/`reference/` 两桶解禁再借（用户拍板②；`_misc/` 定性历史池）；卡名 YYMMDD → `YYYY-MM-DD`（用户拍板①，全仓一种日期格式，9 卡 git mv + 活指针修复）；毕业门第二行理顺为等待卡口径（确认 2026-10-02 治理轮决定，不逆转） | [_backlog/README.md](../_backlog/README.md)；[implemented/2026-10-03-backlog-charter-refit](../notes/implemented/2026-10-03-backlog-charter-refit.md) |
| D34 | **intents.md 退役（2026-10-04，用户令「有了 `_backlog` 还放在这儿是噪声」）**：第三本账（内容 100% 派生自 Note 状态行，_backlog 章程反双记账同款病）+ 膨胀病史三次（40.5KB 胖行 / 96 行超窗 / 61 行触限）+ 违反上游 no-index 教义（vendor notes README："Do not add a centralized `INDEX.md`"——活跃树即清单）⇒ 整表冻结进 `notes/archived/intents-2026-10.md`（终档）后删文件；拆 `intents-row-budget` 门禁与窗口规矩；五处指针重接（AGENTS ×2 / dev-loop ×2 / index / verify / entry-probe Q11）。授权链线索住 Note 状态行，时间轴 = notes/ 文件名日期 + git log | [implemented/2026-10-04-doc-snr-cleanup-round](../notes/implemented/2026-10-04-doc-snr-cleanup-round.md) 决定④ |
| D35 | **notes/ 分类 owner 文件 + notes-liveness 门禁（2026-10-05，用户令「精神应抄袭自 ai_dsh_assitant/notes/README，否则 proposed→implemented 与 SDLC 质量把控不了」）**：审计结论 = 规矩大半已有但散居（dev-loop §12 + proposed/README）；收敛 = 新建 [notes/README.md](../notes/README.md)（状态轴/义务范围/取代检查/备选必载/毕业改写/真证据，细则从 dev-loop §12 迁出为唯一家，指针随迁 AGENTS ×2 + index sdlc 行）；门禁 notes-liveness 立（implemented/ 文件名日期 ≥ 2026-10-05 的 Note 状态行以 implemented/已交付/已消化 开头，存量祖父豁免，反证三步含门禁自身正则 bug 的先红后修）；「验收可执行」标准（哪条命令/断言什么/红长什么样——实施者不看对话就能复现）进 proposed/README；与借源仓对齐与偏离登记见其 §四 | [notes/README.md](../notes/README.md)；[implemented/notes-taxonomy-owner](../notes/implemented/2026-10-05-notes-taxonomy-owner.md) |

### 待定与活动提案

旧问题 Q1–Q8 均已闭合（Q1→D18、Q2→D16、Q3→D17、Q4 于 2026-09-22 定案、Q5–Q8→D22）。这只结算该组问题；当前任务源 = [notes/proposed/](../notes/proposed/README.md) 已批 RFC 与用户点名（D32，无中心队列；磨活走 [_backlog/plans/](../_backlog/plans/README.md) 推敲卡）；旧磨清单/搁置池整池退役归 [_backlog/_done/_misc/](../_backlog/_done/_misc/)，点名才读（条目名不在此复述——复述会过期，2026-09-24 探针实证）；D33 复立的 `_done/_suspended_*` 搁置卡桶同非任务源（重启须用户明确决定）。

## 文档路由

本表说明主题事实的 owner，不代表该面在当前提交经过完整覆盖或认证；验证状态与缺口见各合同及相关 Note。

| 面 | 事实家 / 导航 |
|---|---|
| 机制——公司怎么组装、角色怎么隔离、UI 往哪挂 | design/architecture + design/roles-isolation + design/ui-demo；源码与运行结论按对应合同核对 |
| 内容——角色说什么话、带什么技能、KB 放哪 | design/role-content-plan + presets.md + `company-workspace/kb/` + `company-workspace/AGENTS.md` |
| 运营——token 怎么省、现场出状况怎么办 | guides/budget-and-ops |
| 流程——任务怎么进、证据怎么交、门禁怎么守 | guides/dev-loop + `notes/` + `checks/run-gates.mjs` |

## 外部研究材料登记（repo 外，只读引用）

本 repo 的形态与机制结论大量借鉴三处 repo 外材料（均在 `/Users/bowhead/deepseek-harness/`
工作树内、已被该 repo 的 git 跟踪；不在本 repo 版本控制范围，引用时注明是外部研究材料）：
`_faq_on_digested/`、`_digested/`、`_dsh_plugin_agent_ready_development/`（后者 = Agent-ready 语料，更名自
`_agent_ready_development` 并随上游 re-pin 演进，判定台账见下表该行）；
另有第四处**独立外部仓** = `/Users/bowhead/ai_deerflow_deep_research_v2`（`_backlog` 借鉴源，见下表与 D31）；第五处 = `/Users/bowhead/ai_dsh_loop_advisor/_backlog`（D31 制度的演进宿主，D33 回借源，见下表）；第六处 = `/Users/bowhead/ai_dsh_assitant/notes`（notes/ 分类 owner 精神借源，D35——本仓 notes/README 同日落地后日常不依赖原文）。
该研究树 HEAD 持续演进（本地 FAQ/docs 工作）；引用以各材料注册行核对的版本为准，`_digested` 审计基线
已同 pin（2026-10-02 核对其 00-index：`dsh-v0.2.0-rc.2`，0009 轮随升）——引外部笔记时以基线对齐，不追研究树新提交。
**思想吸收进本 repo 文档后，日常不再依赖原文**；下表是"哪个想法落在了哪儿"的地图：

| 材料 | 内容 | 吸收落点 |
|---|---|---|
| `_faq_on_digested/13_expert-plugin-repo-organization/answer.md` | 五决策框架（入口形态/包粒度/DSH 源码位置/UI 层/spec 流程） | D1–D3、D6；design/architecture §0–§2、§9 |
| `…/option-a-standalone-with-pinned-dsh.md` | **本 repo 形态依据（Option A）**：目录树、装法、取舍、升级阶梯 | design/architecture §6（目录树）、§8–§9；AGENTS.md 布局/簿记 |
| `…/dev-loop.md` | 开发过程生命周期（六步闭环/调试阶梯/设计四问/插拔速查） | guides/dev-loop（全文吸收）；AGENTS.md 纪律 |
| `…/dual-home-isolation.md` | 双 home 机制、崩溃半径、迁移方向 | run/env.sh；guides/dev-loop §6 |
| `…/research.md` | 第三方生态证据（peers/兼容矩阵/自包含/真实安装形状） | guides/dev-loop §5 发布纪律时点；design/architecture §8 |
| `_digested/`（源码消化笔记） | DSH 源码机制笔记（审计基线，版本唯一见 `AGENTS.md` §vendor 簿记——**基线可能落后当前钉住一代**，升 pin 未重审时以簿记注记为准） | design/ 各篇（architecture / roles-isolation / ui-demo）的机制核对引文；**权威仍在 `vendor/dsh/` 本体** |
| `_dsh_plugin_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`（语料更名前后路径同页） | DSH Agent Note 生命周期（状态/路径/格式/取代/归档；判定基于 0.1.7-rc.1 树，rc.2 收窄为「持久决定理由」后 D35 全量对齐） | [notes/README.md](../notes/README.md)（D35 迁入）+ [implemented/notes-lifecycle-absorption](../notes/implemented/2026-09-24-notes-lifecycle-absorption.md)（2026-09-24 点选吸纳六条） |
| `_dsh_plugin_agent_ready_development/`（三卷 + `_coverage` + `verify.mjs`；更名自 `_agent_ready_development`，0009–0013 轮演进后钉 `dsh-v0.2.0-rc.2` = 本仓当前 pin） | 插件仓视角开发语料：native-development-model（独立插件仓闭环——**直接以本仓这类 repo 为受众**）/ sdlc-reference / repo-harness 三卷 | 旧判定 = [archived/harness-alignment-ledger](../notes/archived/2026-09-25-harness-alignment-ledger.md)（27 篇零待定，**不照搬清单在其 §四.4**，仍有效）；rc.2 + 新卷增量判定与四焦点线修订 = [implemented/plugin-corpus-realignment](../notes/implemented/2026-10-07-plugin-corpus-realignment.md) |
| 人机交互 UX 研究来源集（Temporal/Claude Code/Warp/GitHub/PagerDuty/Slack/Horvitz 等） | 阶段 0 外部实践研究的引用全集与逐条判定 = [research/human-agent-ux-patterns](../notes/archived/2026-09-25-human-agent-ux-patterns.md)（外部资料只作数据；Horvitz 两篇 PDF 未逐字核） | 人机合一条目的 A2/B 切片依据 |
| `_faq_on_digested/07_borrowing-dsh-harness-idea/` | 「另一个项目怎么借 DSH」的可迁移框架：三条立场（agent 一等 / 规则可执行 / 事实唯一 owner）+ 十维评估 + 垂直切片 + 四边界（可读≠简单 / Skill≠enforcement / 清理≠回滚 / 查询≠沙箱） | 本仓十维差距审计（2026-09-27）= [archived/harness-gap-audit-faq07](../notes/archived/2026-09-27-harness-gap-audit-faq07.md)：道五维像回事、唯一结构性缺口 = 反馈 enforcement 通道——**已于同日修复** = [implemented/enforcement-channel-and-boundaries](../notes/implemented/2026-09-27-enforcement-channel-and-boundaries.md) |
| `/Users/bowhead/ai_deerflow_deep_research_v2/_backlog`（独立外部仓，同机工作树） | 另一个 harness 仓的待办/推敲层规矩：plans（推敲卡）/ bugs（缺陷卡）/ `_done`（位置即状态）/ `_` 前缀语义 / 搬迁铁律（git mv、文件名不变、内容不重写、编号权威住归档侧）+ 它自己那份「借 DSH」总账（借精神不抄形式的方法论样本） | `_backlog/` 全套 + 毕业四门（D31）；判定、取舍与不借清单 = [implemented/2026-09-28-backlog-deliberation-space](../notes/implemented/2026-09-28-backlog-deliberation-space.md) |
| `_faq_on_digested/04/05/11/15`（4 目录） | 根入口文档静态/运行时设计 + 原生开发环 + loop 工程 vs SDD | 判定（2026-09-28，两子代理分读 + 现状核账） = [archived/faq-04-05-11-15-judgment](../notes/archived/2026-09-28-faq-04-05-11-15-judgment.md)：立即借九条已落地 = [implemented/harness-polish-hygiene-round](../notes/implemented/2026-09-28-harness-polish-hygiene-round.md)（手册注入面预算栅栏等），有压力再借六条带触发条件，「防重复评估」节防重读全文 |
| `/Users/bowhead/ai_dsh_loop_advisor/_backlog`（独立外部仓，同机工作树；2026-10-03 当日态） | D31 制度的直系后代（本仓 → ai_dsh_architect → advisor，其间又借 ai_deerflow_dr_v3 主干框架）：四门/主干框架/三条硬规则/章程账本二分/搁置池新纪律（搁置 = 队列决定，agent 不得自行判搁置）/索引交叉核对门禁/随卡归档的 reference/ | 章制回借（D33）：主干框架与硬规则、章程账本二分、backlog-liveness 升格、两桶解禁、全日期卡名；判定与不借边界 = [implemented/2026-10-03-backlog-charter-refit](../notes/implemented/2026-10-03-backlog-charter-refit.md) |

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
