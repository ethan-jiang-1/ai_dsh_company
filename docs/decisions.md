# 决策台账（路由表）

> 什么时候读：查某个 D 号的决定家、或新增 D 号时。性质：导航/路由——D 号 → 一句话 → 家；决定正文住 Note，本页不复述（自 index 迁出；登记见 index）。

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
| D12 | patch 语义：`- id:` 只替换已有行，新增行必须 `- insert:` 子列表 | [bootstrap §插拔速查](./guides/bootstrap.md) |
| D13 | 开发纪律沿用 DSH；偏离须登记。默认适配自由已收紧 | [AGENTS.md](../AGENTS.md) |
| D14 | 显示名 `<公司名> <角色>` 序列化；preset id 保持 kebab；公司名现行 = 梦之队（D41） | [wochen-naming](../notes/archived/2026-09-22-wochen-naming.md) |
| D15 | 完成定义 = 该面最小「真检查」通过；发现权在代理一侧不在人 | [agent-workflow-community-practice](../notes/archived/2026-09-22-agent-workflow-community-practice.md) |
| D16 | 角色模型路由 = 全员同模型（不写 `agentOptions`） | [presets](./presets.md)；[tests/presets](../tests/presets/presets.spec.ts) |
| D17 | 公司事实全部留 workspace 活数据；pack 不含公司事实（**出厂样例除外**——`content/state` 与 `charters` 是首启只补缺的默认值，不是活数据） | [presets](./presets.md)；[pack content](../packages/company-pack/content/)（dev 盘 = `company-workspace/`，gitignored） |
| D18 | CEO 命名委托不承担续驶（0.2.1 起每次调用 = activation，终稿走完成通知）；续驶归 team；CEO preset 不放全局控制行 | [delegation](./delegation.md) |
| D19+D21 | R5 拆轮 + 搁置池准入 **历史**：轮次制已由 D23/D24 退役，整池已随 D32 退役 | [_misc/suspended.md](../_backlog/_archive/legacy/suspended.md) |
| D20 | 交付物三态判据：成品 = Lead 的 `present`；比对按 slug+角色身份不按路径 | [r4-workshop-flow](../notes/archived/2026-09-22-r4-workshop-flow.md) |
| D22 | 在场板主键 = team roster；冷启动 = 读 `agentTeam` 投影推送（历史：拉式 RPC + 5s 轮询，0.1.7 起退役） | [org-presence-board](../notes/archived/2026-09-22-org-presence-board.md) |
| D23+D24 | 开发流条目制 **历史**：队列 owner ROADMAP.md 已由 D32 退役 | [roadmap-retirement](../notes/archived/2026-09-28-roadmap-retirement.md) |
| D25 | 培养 = 改 `presets/<role>/`（生效边界按面）；学习 = journal 唯一载体（2026-10-13 扩三面 → D43） | [twin-cultivation](../notes/implemented/2026-09-24-twin-cultivation.md) |
| D26 | 文档卫生按指导价值取舍；文件/行数仅观察，不是完成门槛 | [dev-loop](./guides/dev-loop.md) |
| D27 | 升 pin 偏离官方事务（嵌套工作区不能 vendor 自建）⇒ 手工簿记 + 门禁留证 | [pin-upgrade-0.2.0-rc.2](../notes/archived/2026-09-30-pin-upgrade-0.2.0-rc.2.md) |
| D28 | 枚举型事实的家 = 实现自己（文档只留分层原则 + 指针） | [entry-execution-chain-debt](../notes/archived/2026-09-26-entry-execution-chain-debt.md) |
| D29 | 自主优先协议：先探索后发明、借鉴成熟插件、REVIEW 分级 | [policy §P5](./policy.md) |
| D30 | notes 侧旧 research 层退役（triage 归 notes/README）；现行调研家 = _backlog/research/ | [notes/README](../notes/README.md) |
| D31 | 推敲空间 `_backlog/`；只承载判断材料、不承载授权；现行制度 2026-10-09 自 ai_dsh_assitant/_backlog 整体重立 | [_backlog/README](../_backlog/README.md) · [backlog-issue-lifecycle](../notes/archived/2026-10-09-backlog-issue-lifecycle.md) |
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
| D43 | 培养三面：第三主视图＝培养（立时第四子页）；方法层公司级（M3 起）；CEO 仅建议权（D25 部分取代） | [agent-cultivation-loop](../notes/implemented/2026-10-13-agent-cultivation-loop.md) |
| D44 | 成品目录 = 盘上 meta/final 的生成索引 + 只读右栏页签；host 生成（present 事件投影，未核=null）；完整审计仍归操作员 | [deliverables-catalog](../notes/implemented/2026-10-19-deliverables-catalog.md)（补充 = [installed-shape-self-sufficient](../notes/archived/2026-10-25-installed-shape-self-sufficient.md)） |
| D45 | run bundle = 一次安装的物理单元（bundle.json + home + workspace）；身份落点被 D51/D52 取代 | [RFC run-bundle-install-unit](../notes/implemented/2026-10-24-run-bundle-install-unit.md) |
| D46 | 产品仓历史只留产品与合成 fixtures；真实部署证据移私有仓；remote 重建为 private | [run-bundle-install-unit](../notes/implemented/2026-10-24-run-bundle-install-unit.md) |
| D47 | backlog→notes 交接契约：用户是队列；notes 不是收件箱；卡顶结论/去向为记录家；关闭以结论确认为准 | [handoff-contract](../notes/implemented/2026-10-25-backlog-notes-handoff-contract.md) |
| D48 | 目录独立启动 = 隔离 home + web profile + copy 骨架；产品入口被 D51/D52 取代 | [standalone-deployment](../notes/archived/2026-10-25-standalone-deployment.md) |
| D49 | notes 长期治理：取代门禁 + 收据层 + 机械审计；收敛证据随归档件 | [governance](../notes/implemented/2026-10-30-notes-consistency-governance.md) · [converge-evidence](../notes/implemented/2026-10-30-converge-evidence-home.md) |
| D50 | 研究按研究题组织：题目录 + 题名页（问题/消费者/产出的卡/材料）；双索引一题一行；`backlog-liveness` 两级校验 | [_backlog/research](../_backlog/research/README.md) · [research-topics Note](../notes/implemented/2026-10-30-backlog-research-topics.md) |
| D51 | 插件即产品：`company` profile + workspace 自持 run bundle（v2 形状被 D52 取代；方法层/账本留 host 沿用） | [v2 manifest Note](../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md) · [_backlog 伞卡](../_backlog/_archive/settled_issues/2026-11-01-plugin-as-product.md) |
| D52 | 插件即产品 v3：DSH-native 入口；无 launcher；内容在包；run bundle 与账本按 workspace 分区 | [v3 Note](../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md) · [v3 卡](../_backlog/_archive/settled_issues/2026-11-01-plugin-as-product-v3.md) |
| D53 | 会话检索 = bundle 内 insert + isolate 独立 provider 组；不替换 host 行（默认 in-app 安装约束） | [lifecycle Note](../notes/implemented/2026-11-01-plugin-lifecycle-publish.md) |
| D54 | 发布姿态 = MIT + npm 身份 + 市场 index 交接；npm publish 仍人工（[publish-handoff](./guides/publish-handoff.md)） | [lifecycle Note](../notes/implemented/2026-11-01-plugin-lifecycle-publish.md) |
| D55 | 发行版六轴与术语对齐：公司状态/run trace；发布字节装 `_dist`、sourceFingerprint；docs-first legacy 名 | [distribution-alignment Note](../notes/implemented/2026-11-02-distribution-alignment.md) |
| D56 | backlog 五道门：issue `待落地`、研究题名页 `调研中/已定性`、去向封闭集与审查记录、门票由门禁钉住；不加 `落地中/待审` | [five-gates Note](../notes/implemented/2026-11-02-backlog-five-gates.md) |
| D57 | 需求编号=身份（MR/REQ/IF/TC）；层归文档头、状态归条目；`/req check` 判重复/悬空/退役/孤儿/覆盖 | [teaming Note](../notes/implemented/2026-11-07-requirements-teaming-program.md) |
| D58 | VP-Eng 三门：根门=Lead（带小队）；命名 child 按 agentPreset 请 CMO/SA/SQA；CEO teammate 受 maxDepth 1 | [teaming Note](../notes/implemented/2026-11-07-requirements-teaming-program.md) |
