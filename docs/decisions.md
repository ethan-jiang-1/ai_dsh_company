# 决策台账（路由表）

> 性质：导航/路由——D 号 → 一句话 → 家；决定正文（理由/输掉的方案/验证证据）住 Note，本页不复述。
> 2026-10-20 自 [index.md](./index.md) 迁出（fresh-agent 审计：index 只留文档地图；台账单独一页）。

本表只是路由：**D 号 → 一句话 → 决定的家**。决定正文（理由 / 输掉的方案 / 验证证据）住 Note，本表不复述；冲突时以 Note 为准。历史适用范围见各行「历史」标注；编号不重用、不删行；新 D 号须带可解析的家（`ledger-routing` 门禁）。台账只有正向门禁（新 D 号有家）；反向（制度级重立必有台账行/登记行）无门禁——2026-10-09 `_backlog` 整体重立曾漏网（已由 D31 行与外部材料表第七处补路由），复发再按升格判据（dev-loop §9）议门禁。

| # | 一句话 | 决定的家 |
|---|---|---|
| D1 | 自写包只有一个（company-pack）；角色是 preset 目录不是包 | [architecture](./design/architecture.md) §2 |
| D2 | 角色 = agent preset（persona 行 + 自有 skills/ + 工具行），preset 只放差异 | [architecture](./design/architecture.md) §1/§6 |
| D3 | repo 形态 = 独立 repo + `vendor/dsh` pinned submodule + 双 home | [architecture](./design/architecture.md) §6 |
| D4 | demo 主通道 = Agent Teams；事件从 CEO 进出由 Lead-only 权威内建 | [architecture](./design/architecture.md) §2.2 |
| D5 | 第 0 天零自定义 JS：纯配置 pack 即可跑通 demo v0 | [architecture](./design/architecture.md) §2.1 |
| D6 | UI 分层：第 0 层用现成 `client-ui-agent-team`，皮肤层进同 pack client 面 | [ui-demo](./design/ui-demo.md) §0/§2 |
| D7 | KB 三载体：角色知识→preset skills；公司手册→project root；活数据→workspace | [architecture](./design/architecture.md) §5 |
| D8 | 跨会话角色记忆 = workspace journal 文件（`kb/<role>/journal/`） | [roles-isolation](./design/roles-isolation.md) §4.2 |
| D9 | 上游缺口若成刚需→提 seam，不 vendor patch | [roles-isolation](./design/roles-isolation.md) §4.1 |
| D10 | docs/ 按性质分层，不按时间分层；否决「初始化/」目录方案 | [docs/AGENTS.md](./AGENTS.md) |
| D11 | 迭代单位 = 垂直轮 **历史**：轮次制已退役 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D12 | patch 语义：`- id:` 只替换已有行，新增行必须 `- insert:` 子列表 | [dev-loop §4](./guides/dev-loop.md) |
| D13 | 开发纪律沿用 DSH；偏离须登记。默认适配自由已收紧 | [AGENTS.md](../AGENTS.md) |
| D14 | 显示名 `<公司名> <角色>` 序列化；preset id 保持 kebab；公司名现行 = 梦之队（D41） | [wochen-naming](../notes/archived/2026-09-22-wochen-naming.md) |
| D15 | 完成定义 = 该面最小「真检查」通过；发现权在代理一侧不在人 | [agent-workflow-community-practice](../notes/archived/2026-09-22-agent-workflow-community-practice.md) |
| D16 | 角色模型路由 = 全员同模型（不写 `agentOptions`） | [presets](./presets.md)；[tests/presets](../tests/presets/presets.spec.ts) |
| D17 | 公司事实全部留 workspace 活数据；pack 不含公司事实 | [presets](./presets.md)；[pack workspace](../packages/company-pack/workspace/)（dev 盘 = `company-workspace/`，gitignored） |
| D18 | CEO 命名委托不承担续驶（0.2.1 起每次调用 = activation，终稿走完成通知）；续驶归 team；CEO preset 不放全局控制行 | [delegation](./delegation.md) |
| D19+D21 | R5 拆轮 + 搁置池准入 **历史**：轮次制已由 D23/D24 退役，整池已随 D32 退役 | [_misc/suspended.md](../_backlog/_archive/legacy/suspended.md) |
| D20 | 交付物三态判据：成品 = Lead 的 `present`；比对按 slug+角色身份不按路径 | [r4-workshop-flow](../notes/archived/2026-09-22-r4-workshop-flow.md) |
| D22 | 在场板主键 = team roster；冷启动 = 读 `agentTeam` 投影推送（历史：拉式 RPC + 5s 轮询，0.1.7 起退役） | [org-presence-board](../notes/archived/2026-09-22-org-presence-board.md) |
| D23+D24 | 开发流条目制 **历史**：队列 owner ROADMAP.md 已由 D32 退役 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D25 | 培养 = 改 `presets/<role>/`（生效边界按面）；学习 = journal 唯一载体（2026-10-13 扩三面 → D43） | [twin-cultivation](../notes/implemented/2026-09-24-twin-cultivation.md) |
| D26 | 文档卫生按指导价值取舍；文件/行数仅观察，不是完成门槛 | [dev-loop](./guides/dev-loop.md) |
| D27 | 升 pin 偏离官方事务（嵌套工作区不能 vendor 自建）⇒ 手工簿记 + 门禁留证 | [pin-upgrade-0.2.0-rc.2](../notes/archived/2026-09-30-pin-upgrade-0.2.0-rc.2.md) |
| D28 | 枚举型事实的家 = 实现自己（文档只留分层原则 + 指针） | [entry-execution-chain-debt](../notes/archived/2026-09-26-entry-execution-chain-debt.md) |
| D29 | 自主优先协议：先探索后发明、借鉴成熟插件、REVIEW 分级 | [dev-loop §13](./guides/dev-loop.md) |
| D30 | notes 侧旧 research 层退役（triage 归 notes/README）；现行调研家 = _backlog/research/ | [notes/README](../notes/README.md) |
| D31 | 推敲空间 `_backlog/`；只承载判断材料、不承载授权；现行制度 2026-10-09 自 ai_dsh_assitant/_backlog 整体重立 | [_backlog/README](../_backlog/README.md) · [backlog-issue-lifecycle](../notes/implemented/2026-10-09-backlog-issue-lifecycle.md) |
| D32 | 队列层退役（ROADMAP.md 删除）；已批→RFC 状态行「批准：」标记 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D33 | `_backlog` 章制回借（主干框架/章程账本二分/索引交叉核对门禁/全日期卡名） | [_backlog/README](../_backlog/README.md) |
| D34 | intents.md 退役（第三本账 + 胖行病史 + 违反上游 no-index 教义） | [notes/README](../notes/README.md) |
| D35 | notes/ 分类 owner 文件 + `notes-liveness` 门禁 | [notes/README](../notes/README.md) |
| D36 | 决策台账降级为纯路由表（第三本账同 D34 病）+ `ledger-routing` 门禁 | [ledger-routing-table](../notes/archived/2026-10-09-ledger-routing-table.md) |
| D37 | `docs/` 分层规则唯一家住 `docs/AGENTS.md`（含「不属于这层」列）+ `doc-taxonomy` 门禁 | [docs-tier-taxonomy](../notes/archived/2026-10-09-docs-tier-taxonomy.md) |
| D38 | implemented/ Note 的**事实落点**随改动就地改新（决定正文仍冻结）；生效日分档 + `zz-` 假路径记号 | [implemented-note-currency](../notes/implemented/2026-10-09-implemented-note-currency.md) |
| D39 | 完成定义 skills 住 `.agents/skills/`（清单 = 目录本身）；程序进 skill、可机械判断的才进 gate | [completion-definition-skills](../notes/archived/2026-10-09-completion-definition-skills.md) |
| D40 | 事故护栏复原：`preset-required-config` 门禁（判据 = vendor committed config-catalog） | [postmortem-guard-restoration](../notes/implemented/2026-10-09-postmortem-guard-restoration.md) |
| D41 | 公司名 = 梦之队（Dream Team）；D14 显示名前缀序列化沿用，前缀随名换代 | [dreamteam-naming](../notes/archived/2026-10-10-dreamteam-naming.md) |
| D42 | vendor 升 pin＝用户策动制（agent 不盯不评不建议）＋渠道只认 RC/正式版，alpha/beta 通通不管 | [pin-upgrade-policy](../notes/archived/2026-10-12-pin-upgrade-policy.md) |
| D43 | 培养回路三面：公司页第四子页＝培养；本人采纳 → 角色方法层（profile 根下按角色隔离）；CEO 仅建议权（D25 部分取代） | [agent-cultivation-loop](../notes/implemented/2026-10-13-agent-cultivation-loop.md) |
| D44 | 成品目录 = 盘上 meta/final 的生成索引 + 只读右栏页签；host 生成（present 事件投影，未核=null）；完整审计仍归操作员 | [deliverables-catalog](../notes/implemented/2026-10-19-deliverables-catalog.md) + [installed-shape-self-sufficient](../notes/implemented/2026-10-25-installed-shape-self-sufficient.md) |
| D46 | 产品仓历史只留产品与合成 fixtures；真实部署证据移私有仓；remote 重建为 private | [run-bundle-install-unit](../notes/implemented/2026-10-24-run-bundle-install-unit.md) |
| D45 | run bundle = 一次安装的物理单元（bundle.json + home + workspace）；不进 git；基部随 pack、扩张住 bundle | [RFC run-bundle-install-unit](../notes/implemented/2026-10-24-run-bundle-install-unit.md) |
| D47 | backlog→notes 交接契约：用户是队列；notes 不是收件箱；卡顶结论/去向为记录家；关闭以结论确认为准 | [handoff-contract](../notes/implemented/2026-10-25-backlog-notes-handoff-contract.md) |
| D48 | 目录独立启动 = 隔离 home + 自建 web profile + copy 骨架；入口 `pnpm standalone`；不承诺预构建/跨 OS | [standalone-deployment](../notes/implemented/2026-10-25-standalone-deployment.md) |

### 待定与活动提案

旧问题 Q1–Q8 均已闭合（Q1→D18、Q2→D16、Q3→D17、Q4 于 2026-09-22 定案、Q5–Q8→D22）。这只结算该组问题；当前任务源 = [notes/proposed/](../notes/proposed/README.md) 已批 RFC 与用户点名（D32，无中心队列）；未成熟的问题在 [_backlog/issues/](../_backlog/issues/README.md) 澄清，不是实施任务。旧磨清单与搁置池按历史记录归 [_backlog/_archive/legacy/](../_backlog/_archive/legacy/README.md)，不是任务源；当前问题关闭、暂停和触发规则见 [_backlog/README](../_backlog/README.md)。
