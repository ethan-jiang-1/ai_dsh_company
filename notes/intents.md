# 意图登记

| 日期 | 意图（动机 + 外部可观察行为） | 状态 |
|---|---|---|
| 2026-09-21 | 阶段 0 立环：repo 骨架可承载 docs 全部设计决定——`pnpm verify` 全绿、submodule 钉 tag、四 preset 结构就位 | implemented → [implemented/2026-09-21-repo-scaffolding.md](./implemented/2026-09-21-repo-scaffolding.md) |
| 2026-09-21 | docs/ 分层重组：按性质（导航/设计/计划/指南/合同）不按时间；"初始意图"归 notes | implemented → [implemented/2026-09-21-docs-layering.md](./implemented/2026-09-21-docs-layering.md) |
| 2026-09-21 | 开发环沉淀 + agent 直达：guides/60、00-index 外部材料登记与术语映射加 vendor 落点列、AGENTS.md 小修（含密钥节与探索路由补强）；FAQ 原文登记不复制 | implemented → [implemented/2026-09-21-dev-loop-guide.md](./implemented/2026-09-21-dev-loop-guide.md) |
| 2026-09-21 | 双 DSH 立为一等事实：vendor 基线 / 日用全局安装 / 外部研究树三实体表进 AGENTS.md，env.sh 裸 dsh 环境级拦截，guides/60 §6 扩双 DSH | implemented → [implemented/2026-09-21-dual-dsh-entities.md](./implemented/2026-09-21-dual-dsh-entities.md) |
| 2026-09-21 | roadmap 重切垂直轮（D11）+ UI 归轮 + 轮次交接清单（新会话开工/轮次收尾）：R1 两人公司最薄全路径，团队 UI R1 观察窗 R2 验收，皮肤 R5；Q4 降为最小动议 | implemented → [implemented/2026-09-21-vertical-rounds.md](./implemented/2026-09-21-vertical-rounds.md) |
| 2026-09-22 | R0 立环验收：workspace 形状/版本对齐/pnpm 入口/tsconfig 门面/局部 host 面/原生 flock 零特权编译/roots 实测回填/profile.md 诞生——`pnpm dsh --profile headless` 真会话跑通 | implemented → [implemented/2026-09-22-r0-loop-acceptance.md](./implemented/2026-09-22-r0-loop-acceptance.md) |
| 2026-09-22 | R1 两人公司：CEO/VP-Eng 正式 persona+skills+KB，company profile 部署+team web bundle 观察窗，入戏探针（M1），跑动议「知识库自建技术评估」出第一份 deliverable | implemented → [implemented/2026-09-22-r1-close.md](./implemented/2026-09-22-r1-close.md) |
| 2026-09-22 | R1 中途文档同步（fresh-agent 审计）+ 纪律强调：AGENTS.md 纪律段改"全程沿用 DSH 纪律"并建权威对照表（D13），修 README/AGENTS/pack README/design10 §6/00-index/guides60 的陈旧叙述 | implemented → [implemented/2026-09-22-r1-docs-sync.md](./implemented/2026-09-22-r1-docs-sync.md) |
| 2026-09-22 | 回归测试资产（R1）：`pnpm test` keyless vitest 四条（roster 零 broken / 行依赖 / 内容定稿 / bundle 语法）+ guard 反证（删依赖看变红）；发现 **preset 只在 Web 面挂载**（headless/sdk/acp 绕过），删掉测错面的 headless e2e | implemented → [implemented/2026-09-22-r1-deploy-findings.md](./implemented/2026-09-22-r1-deploy-findings.md) |
| 2026-09-22 | 公司命名 + 角色显示名系列化（D14）：公司名 `wochen`，显示名 `<公司名> <角色>`，id 保持 kebab，层级不动；新增前缀一致性测试 | implemented → [implemented/2026-09-22-wochen-naming.md](./implemented/2026-09-22-wochen-naming.md) |
| 2026-09-22 | pack 长出 client 面（皮肤第一块砖）：`dsh.client` + `exports["./client"]` + 自建双半 tsdown；注册 `sidebar.brand.name`；`DSH_CLIENT_TITLE` 构建期品牌 | implemented → [implemented/2026-09-22-client-face-brand.md](./implemented/2026-09-22-client-face-brand.md) |
| 2026-09-22 | **吸纳社区/厂商一手经验（D15）**：完成定义 = 该面最小真检查通过、发现权在代理一侧；补 client-half 门禁（含反证）+ boot 清单依赖闭环；否决 spec 流程与"加长指令文件"；写两篇事故复盘 | implemented → [research/2026-09-22-agent-workflow-community-practice.md](./research/2026-09-22-agent-workflow-community-practice.md)；[postmortem/](./postmortem/README.md) |
| 2026-09-22 | R2 前 UI 薄片重排（R1 体感反馈）：界面表达跟随其机制同轮交付——R2 分镜「两空间镜头」+ 任务板活面板、R3 委派工具卡提前、R5 驾驶舱含协作动态流；消息流经 vendor 实证非薄片，留 R5 | implemented → [implemented/2026-09-22-r2-ui-slice-replan.md](./implemented/2026-09-22-r2-ui-slice-replan.md) |
