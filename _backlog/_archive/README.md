# _archive/ · 离开活跃区

默认不要读；从活卡或索引点名才打开。路径表示离场状态；历史讨论与证据原文保留，迁移只修导航链接与索引。

| 目录 | 放什么 |
|---|---|
| [settled_issues/](settled_issues/README.md) | 问题已有结论并符合关闭条件 |
| [suspended_issues/](suspended_issues/README.md) | 推敲被用户叫停，尚无结论 |
| [fixed_bugs/](fixed_bugs/README.md) | 已修复缺陷；编号权威在其 README |
| [suspended_bugs/](suspended_bugs/README.md) | 查明但尚未修复的缺陷 |
| [research/](research/README.md) | 归档研究题：题名页 + 一题一行索引；随最后一张活卡整目录迁入 |
| [legacy/](legacy/README.md) | 退役历史池，只按历史引用读取，不再收新件 |

## 已关闭问题

| 卡 | 历史结论 | 日期 |
|---|---|---|
| [2026-11-10-product-type-semantics.md](settled_issues/2026-11-10-product-type-semantics.md) | 已结；`b2b-saas` → `business-software`（MRD/StRS/PRD；SaaS 交付模式）+ product-definition/manifest/fixture/tests/docs；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-business-software-product-type.md) | 2026-11-10 |
| [2026-11-10-motion-product-type.md](settled_issues/2026-11-10-motion-product-type.md) | 已结；`meta.md` 产品类型 + `/req check` 动议优先/company 回落/未知报错 + 角色/手册/测试；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-motion-product-type.md) | 2026-11-10 |
| [2026-11-10-coo-cfo-delegation.md](settled_issues/2026-11-10-coo-cfo-delegation.md) | 已结；CEO 五条命名行（`coo`/`cfo` maxDepth 1）+ team 角色包 + model/UI/tests/docs；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-coo-cfo-delegation.md) | 2026-11-10 |
| [2026-11-10-sa-sqa-method-packs.md](settled_issues/2026-11-10-sa-sqa-method-packs.md) | 已结；`system-architecture@1.0.0` + `vv-plan@1.0.0` 两侧方法 + `methods:init` + blocker 升级 + tests；verify/test/typecheck/preset-smoke 全绿；去向 = [Note](../../notes/implemented/2026-11-10-sa-sqa-method-packs.md) | 2026-11-10 |
| [2026-11-10-materiality-and-trace-decision.md](settled_issues/2026-11-10-materiality-and-trace-decision.md) | 已结；材料性 = 授权与留痕共用判据（章程一处定义 + 三处引用）+ 缺陷轨 `留痕：` 裁决 + 归档卡去向落点解析门（self-link 红→绿）；落点修复 2 卡 + 6 索引行；verify ALL PASS、167 files/1348 tests；去向 = [Note](../../notes/implemented/2026-11-10-materiality-and-trace-decision.md) | 2026-11-10 |
| [2026-11-10-producer-verifier-quality-loop.md](settled_issues/2026-11-10-producer-verifier-quality-loop.md) | 已结；质量环（`quality-loop-producer` 有手 / `quality-loop-verifier` 真只读·无 bash + VP-Eng `quality_loop_produce`/`quality_loop_verify` 命名行 + 共享流程 skill + 角色方法层 `<pack>@<version>` fail-closed + 裁决原文/哈希 + 事后审计判据与非角色边界派生）；verify/test/typecheck/preset-smoke 全绿、审计自证 5 支、一次真模型 E2E（R1 fail→R2 pass，审计 ALL PASS）；去向 = [Note](../../notes/implemented/2026-11-10-producer-verifier-quality-loop.md) | 2026-11-10 |
| [2026-11-10-content-charter.md](settled_issues/2026-11-10-content-charter.md) | 已结；内容宪章（四槽/三层/四问/两测/两消费者/成本表/红牌/变更协议）+ 归位 skill + 入口门 `charter-entry`（5 条负例留证 / 3 支全覆盖）+ 卡模板 `## 抽象度` + P5 归位一问；verify ALL PASS、167 files/1347 tests；冷读证「撞得到 + 用得上」；去向 = [Note](../../notes/implemented/2026-11-10-content-charter.md) | 2026-11-10 |
| [2026-11-10-docs-dsh-alignment.md](settled_issues/2026-11-10-docs-dsh-alignment.md) | 已结；五步 DSH 对齐（值 / index 书架 / design→notes+architecture / genre 拆分 / 5% headroom）+ 四篇 rationale 收口 + canonical 守卫；verify ALL PASS、167 files/1347 tests、typecheck；去向 = [Note](../../notes/implemented/2026-11-10-docs-dsh-alignment.md) | 2026-11-10 |
| [2026-11-10-docs-layer-restructure.md](settled_issues/2026-11-10-docs-layer-restructure.md) | 已结；docs/ 分层重整（顶层 8 门/宪法 + contracts/ 7 + reference/ 3）；index 首屏按目的路由；227+ 链接跟随后 verify ALL PASS、167 files/1347 tests；冻结层 122 文件只改路径；用户“都提交”＝接受；去向 = [Note](../../notes/implemented/2026-11-10-docs-layer-restructure.md) | 2026-11-10 |
| [2026-11-09-company-specificity-externalization.md](settled_issues/2026-11-09-company-specificity-externalization.md) | 已结；三层分离（generic/product-types/company + contracts 版本轴）、T0–T3 加载与 manifest 预算、政策/复核/编号单家、两公司 fixture 与测试字面量门；verify ALL PASS、166 files/1319 tests、release-smoke ALL PASS；去向 = [Note](../../notes/implemented/2026-11-09-generic-specific-separation.md) | 2026-11-09 |
| [2026-11-09-delegation-residuals-closeout.md](settled_issues/2026-11-09-delegation-residuals-closeout.md) | 已结；P-H/P-I 确定性注入、worker-workflow no-go、companyDelegationTerminal 投影；1300、6+3、9 页签全绿；去向 = [残差收口 Note](../../notes/implemented/2026-11-09-delegation-residuals-closeout.md) | 2026-11-09 |
| [2026-11-09-retire-sa-sqa.md](settled_issues/2026-11-09-retire-sa-sqa.md) | 已结；退役 system-architect/system-qa：目录/父行/patch/support/模型 specialist/文档/测试/探针清理；worker family 保留；6+3、1297、verify 全绿；去向 = [退役 Note](../../notes/implemented/2026-11-09-retire-sa-sqa.md) | 2026-11-09 |
| [2026-11-09-specialist-worker-taxonomy.md](settled_issues/2026-11-09-specialist-worker-taxonomy.md) | 已结；researcher→worker-researcher（只读 named-only worker profile）；SA/SQA 升 specialist（skills/authority）；删 leaf；CEO subagent_research 改钉；P-L + preset-smoke 6+5 + 全量绿 | 2026-11-09 |
| [2026-11-09-presets-delegation-architecture.md](settled_issues/2026-11-09-presets-delegation-architecture.md) | 已结；模型/两层合同/静态矩阵/UI 树+completed/failed/retry/worker leaf+小工头；P5 不生成、P-I host 不自动重试；worker-workflow planned；去向 = [Note](../../notes/implemented/2026-11-09-presets-delegation-model.md) | 2026-11-09 |
| [2026-11-08-vpeng-workflow-channel.md](settled_issues/2026-11-08-vpeng-workflow-channel.md) | 已结；vp-eng 接入 workflow 同身份扇出（两行 + 两 peer + 五档 skill + 文档/Note）；Step 0 最小 workflow 绿（danger-full-access）、常驻行为 probe ALL PASS；去向 = [Note](../../notes/archived/2026-11-08-vpeng-workflow-channel.md) | 2026-11-08 |
| [2026-11-08-user-facing-readme-and-first-use.md](settled_issues/2026-11-08-user-facing-readme-and-first-use.md) | 已结；README/手册改使用者面向 + 「第一次经营一家公司」六步 + 凭据/支持口径；`readme-manual-commands` 门先红后绿；冷读 README 7.0/7、手册 7/7；去向 = [Note](../../notes/archived/2026-11-08-user-facing-readme-and-first-use.md) | 2026-11-08 |
| [2026-11-07-sa-sqa-capability-organization.md](settled_issues/2026-11-07-sa-sqa-capability-organization.md) | 已结；SA/SQA 能力组织按场景取用学科域（A+C：固定五行 + 任务书统一声明 + SQA 逐行域审计）；纯软件 live 真跑 R0–R7 全绿 | 2026-11-08 |
| [2026-11-07-requirements-teaming-landing.md](settled_issues/2026-11-07-requirements-teaming-landing.md) | 已结；需求识别/编号 + VP-Eng 组队的程序伞卡：D1–D8 口径、11 张执行卡、W0–W5 执行计划全部收口；去向 = [程序 Note](../../notes/archived/2026-11-07-requirements-teaming-program.md) | 2026-11-07 |
| [2026-11-07-requirements-contract.md](settled_issues/2026-11-07-requirements-contract.md) | 已结；A1 编号合同（R1–R10/退役词/范围豁免/并发）+ meta 标记 + 门禁 | 2026-11-07 |
| [2026-11-07-requirements-templates.md](settled_issues/2026-11-07-requirements-templates.md) | 已结；A2 五层模板 + layer/definition 头 + PRD JSON 唯一定义点 + allocation 附录 | 2026-11-07 |
| [2026-11-07-requirements-checker.md](settled_issues/2026-11-07-requirements-checker.md) | 已结；A5 纯逻辑 checker（重复/悬空/退役/孤儿/覆盖/计数/矩阵） | 2026-11-07 |
| [2026-11-07-requirements-command.md](settled_issues/2026-11-07-requirements-command.md) | 已结；A6 `/req check` 操作员命令 + 命令集注册 | 2026-11-07 |
| [2026-11-07-requirements-cmo-vpeng.md](settled_issues/2026-11-07-requirements-cmo-vpeng.md) | 已结；A3 CMO 产 MRD+StRS、VP-Eng 只产 PRD（source/traces） | 2026-11-07 |
| [2026-11-07-requirements-sa.md](settled_issues/2026-11-07-requirements-sa.md) | 已结；A4a SA 产 SyRS+IRS+allocation+架构，验证点改引用不发号 | 2026-11-07 |
| [2026-11-07-requirements-sqa.md](settled_issues/2026-11-07-requirements-sqa.md) | 已结；A4b SQA 用 TC-### 写 V&V（layer V&V + table-rows + covers + L1–L4） | 2026-11-07 |
| [2026-11-07-requirements-migration.md](settled_issues/2026-11-07-requirements-migration.md) | 已结；A7 旧盘迁移/豁免/升级面（process-docs 只补缺 seed） | 2026-11-07 |
| [2026-11-07-requirements-e2e.md](settled_issues/2026-11-07-requirements-e2e.md) | 已结；A8 五层真跑（重跑一次 ALL PASS：checker 绿 MR4/REQ44/IF8/TC49） | 2026-11-07 |
| [2026-11-07-vpeng-teaming.md](settled_issues/2026-11-07-vpeng-teaming.md) | 已结；B1 VP-Eng 组队（vp_cmo + eng-teaming 四档 + 继承口径修正） | 2026-11-07 |
| [2026-11-07-vpeng-evidence-closeout.md](settled_issues/2026-11-07-vpeng-evidence-closeout.md) | 已结；B2 VP-Eng 包 E2E + CEO 回归（ALL PASS）+ 程序收口 | 2026-11-07 |
| [2026-11-06-system-architect-sqa.md](settled_issues/2026-11-06-system-architect-sqa.md) | 已结；VP-Eng 落地项目的 E/V 分家：SA + SQA 两个委派子人格（子人格档）、委托行 `maxDepth: 2`、SQA 否决直达 CEO；真模型 E2E 证两独立会话/preset/depth=2；去向 = [SA/SQA Note](../../notes/archived/2026-11-06-sa-sqa-subpersonas.md) | 2026-11-06 |
| [2026-11-03-repo-hygiene-round6.md](settled_issues/2026-11-03-repo-hygiene-round6.md) | 已结；fresh agent 七维复评（落地后 A-/A/A-/A-/A-/A-/A-）+ 三棵测试树层次化 + 腐化通道四条机械面（retired-claims / command-refs / dist-manual 同源 / ledger 顺序）+ 错误中继与 D7 两项；去向 = [context-rot-guards Note](../../notes/archived/2026-11-03-context-rot-guards.md) 等 9 篇 | 2026-11-03 |
| [2026-11-03-repo-hygiene-round5.md](settled_issues/2026-11-03-repo-hygiene-round5.md) | 已结（消化）；A–F 各批已落地或被第六轮承接；残余 = npm publish（外部）与零入链分诊（已定性不批量迁） | 2026-11-03 |
| [2026-11-02-remove-trajectory-terminal-ui.md](settled_issues/2026-11-02-remove-trajectory-terminal-ui.md) | 已结；pack 禁 `ui-trajectory` / `ui-sidebar-terminal` 两行，主区 = Chat + 培养、右栏无 New terminal；组合面 + 真页面验收通过；去向 = [Note](../../notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md) | 2026-11-03 |
| [2026-11-02-harness-release-alignment.md](settled_issues/2026-11-02-harness-release-alignment.md) | 已结；FAQ 26 术语/current docs/发布字节证据链对齐；0.7.1；去向 = [distribution-alignment Note](../../notes/implemented/2026-11-02-distribution-alignment.md) | 2026-11-02 |
| [2026-11-02-dev-product-path-parity.md](settled_issues/2026-11-02-dev-product-path-parity.md) | 已结；dev 默认 tarball + `--link` 显式快速通道、parity 指南/门禁、市场 staged；去向 = [parity Note](../../notes/implemented/2026-11-02-dev-product-path-parity.md) | 2026-11-02 |
| [2026-11-01-plugin-lifecycle-publish.md](settled_issues/2026-11-01-plugin-lifecycle-publish.md) | 已结；0.7.0 发布就绪（install/身份/index/升卸/本地 registry 演练）；公有 publish/托管 = handoff | 2026-11-02 |
| [2026-11-01-plugin-as-product-v3.md](settled_issues/2026-11-01-plugin-as-product-v3.md) | 已结；bundle 产品/无 launcher/workspace 解析/内容在包/run bundle 全嵌套/账本分区；0.7.0 复核；去向 = [v3 Note](../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md) | 2026-11-02 |
| [2026-11-01-plugin-as-product.md](settled_issues/2026-11-01-plugin-as-product.md) | 已结；0.5.0 产品形状：company profile/启动器/workspace v2/登记/seed/手册碰撞/方法账本留 host；v1 边界 = Web onboarding/Windows/registry/威胁注入 | 2026-11-01 |
| [2026-11-01-landing-plan.md](settled_issues/2026-11-01-landing-plan.md) | 已结；P0–P6 执行回执；v1 边界不阻塞关闭 | 2026-11-01 |
| [2026-11-01-product-lifecycle.md](settled_issues/2026-11-01-product-lifecycle.md) | 已结；安装/首启/升级/降级/备份/恢复/搬移/卸载/doctor + 运行中升级/坏安装注入 | 2026-11-01 |
| [2026-11-01-workspace-and-data-safety.md](settled_issues/2026-11-01-workspace-and-data-safety.md) | 已结；选/切/搬/备/删、lease、v2 身份、方法/账本留 host + 导出；不可信项目边界测试 | 2026-11-01 |
| [2026-11-01-release-and-docs.md](settled_issues/2026-11-01-release-and-docs.md) | 已结；0.5.0 发布面/文档面落地（手册/README/docs/CHANGELOG/门禁）；registry 不启用、Windows/容器不承诺；验收 = release --verify 全绿 | 2026-11-01 |
| [2026-10-30-cultivation-case-entry.md](settled_issues/2026-10-30-cultivation-case-entry.md) | 已结；培养主任务工作/目标优先单入口第一切片（work 字段 + 单表单 + 预览）；去向 = [case-entry Note](../../notes/archived/2026-10-30-cultivation-case-entry.md)；对话式梳理/AI 起草另决 | 2026-10-30 |
| [2026-10-30-cultivation-entry-followup.md](settled_issues/2026-10-30-cultivation-entry-followup.md) | 已结；目标角色显式选择、入口文案、自纠正状态、验证历史逐条、对话失败保留草稿；去向 = [entry-followup Note](../../notes/archived/2026-10-30-cultivation-entry-followup.md)；主任务 IA 另决 | 2026-10-30 |
| [2026-10-29-cultivation-experience.md](settled_issues/2026-10-29-cultivation-experience.md) | 已结；培养主线（案例工坊 A）+ 来源/决定/验证历史落地；去向 = [implemented Note](../../notes/archived/2026-10-30-cultivation-work-improvement-traceability.md)；真人走查留 Note 后续观察 | 2026-10-30 |
| [2026-10-28-data-design-round2.md](settled_issues/2026-10-28-data-design-round2.md) | 已结；二轮削洋葱 8 项（ctx.fs / 派生显示 / K cache / 日志 / peers 修；指令面/namespace/T4-T7 边界）；0.4.1；去向 = [implemented Note](../../notes/archived/2026-10-28-data-design-round2.md) | 2026-10-28 |
| [2026-10-28-data-design-hardening.md](settled_issues/2026-10-28-data-design-hardening.md) | 已结；数据设计硬化（账本→domain、方法层→公司级、数据卡 v2）；M1–M4 落地（0.4.0）；去向 = [implemented Note](../../notes/archived/2026-10-28-data-design-hardening.md) | 2026-10-28 |
| [2026-10-27-six-dim-raise.md](settled_issues/2026-10-27-six-dim-raise.md) | 已结；六维提分 D1/D4/D5 → A-（开工最小路径 / 0.3.15 交付面 + dist-freshness / UI 金样 + 认证档）；去向 = 三篇 implemented Note | 2026-10-28 |
| [2026-10-27-repo-hygiene-round3.md](settled_issues/2026-10-27-repo-hygiene-round3.md) | 已结；第三轮六维度打扫 A/B/C/D 全批，R3-01…26 逐项处置（18 修 / 5 部分 / 3 明确不作），去向 = 六篇 implemented Note | 2026-10-27 |
| [2026-10-28-repo-hygiene-round4.md](settled_issues/2026-10-28-repo-hygiene-round4.md) | 已结；第四轮六维打扫 A–E 全批，D1–D6 = A-，去向 = 12 篇 implemented Note（A/B/C/D/E1–E6/D6 + P3 follow-up） | 2026-10-28 |
| [2026-10-27-data-model-gaps.md](settled_issues/2026-10-27-data-model-gaps.md) | 已结；G1–G12 落三份 Note，剩余多 Host 高可用为边界 | 2026-10-27 |
| [2026-10-27-data-model-review-followup.md](settled_issues/2026-10-27-data-model-review-followup.md) | 已结；F1–F10 落 [review-followup](./settled_issues/2026-10-27-data-model-review-followup.md) | 2026-10-27 |
| [2026-10-27-data-model-closeout.md](settled_issues/2026-10-27-data-model-closeout.md) | 已结；R1–R6 落 [data-model-r1-r6](../../notes/archived/2026-10-27-data-model-r1-r6.md) | 2026-10-27 |
| [2026-10-25-distribution-contract.md](settled_issues/2026-10-25-distribution-contract.md) | 已实施；去向 = [distribution-lifecycle](../../notes/archived/2026-10-25-distribution-lifecycle.md) | 2026-10-25 |
| [2026-10-25-install-lifecycle-evidence.md](settled_issues/2026-10-25-install-lifecycle-evidence.md) | 已实施；去向 = [distribution-lifecycle](../../notes/archived/2026-10-25-distribution-lifecycle.md) | 2026-10-25 |
| [2026-10-25-shipped-content-self-contained.md](settled_issues/2026-10-25-shipped-content-self-contained.md) | 已实施；去向 = [installed-shape-self-sufficient](../../notes/archived/2026-10-25-installed-shape-self-sufficient.md) | 2026-10-25 |
| [2026-10-25-deliverables-catalog-and-audit.md](settled_issues/2026-10-25-deliverables-catalog-and-audit.md) | 已实施；去向 = [installed-shape-self-sufficient](../../notes/archived/2026-10-25-installed-shape-self-sufficient.md) | 2026-10-25 |
| [2026-10-25-standalone-deployment-shape.md](settled_issues/2026-10-25-standalone-deployment-shape.md) | 已实施；去向 = [standalone-deployment](../../notes/archived/2026-10-25-standalone-deployment.md) | 2026-10-25 |
| [2026-10-25-deployment-identity-and-workspace-guard.md](settled_issues/2026-10-25-deployment-identity-and-workspace-guard.md) | 已实施；去向 = [standalone-deployment](../../notes/archived/2026-10-25-standalone-deployment.md) | 2026-10-25 |
| [2026-09-28-dag-edge-routing.md](settled_issues/2026-09-28-dag-edge-routing.md) | 已实施；决定稿已删，历史在 git | 2026-09-28 |
| [2026-09-28-float-geometry-memory.md](settled_issues/2026-09-28-float-geometry-memory.md) | 已实施；决定稿已删，历史在 git | 2026-09-28 |
| [2026-09-28-sidebar-split-budget.md](settled_issues/2026-09-28-sidebar-split-budget.md) | 不做 | 2026-09-28 |
| [2026-10-10-plain-language-closing.md](settled_issues/2026-10-10-plain-language-closing.md) | 已实施并真验收通过（说人话收口：四模板一分钟摘要 + present description 通道） | 2026-10-10 |
| [2026-10-12-ceo-minimal-assembly.md](settled_issues/2026-10-12-ceo-minimal-assembly.md) | 已实施（组队健壮性三层防御：最小在屋/菜单算术/成员打回权；RFC 与探针收据在卡） | 2026-10-12 |
| [2026-10-23-cultivation-context.md](settled_issues/2026-10-23-cultivation-context.md) | 已实施（D1=A/D2=A；RFC + 实施 Note + 真浏览器 probe） | 2026-10-23 |
| [2026-10-12-workspace-convergence.md](settled_issues/2026-10-12-workspace-convergence.md) | 已落地（收敛执行器 converge.mjs + 常态化入轮末 + 首轮 4 slug 收敛与四缺陷修复） | 2026-10-12 |
| [2026-10-10-multi-instance-guard.md](settled_issues/2026-10-10-multi-instance-guard.md) | 已实施并双实例实测通过（多实例警告横幅）；跨浏览器检测边界如需另立卡 | 2026-10-10 |
| [2026-10-10-extract-without-behavior-change.md](settled_issues/2026-10-10-extract-without-behavior-change.md) | 已实施并验收通过（探针 web 启动与 backlog 活状态收成模块，行为不变） | 2026-10-10 |
| [2026-10-10-smoke-boot-extraction.md](settled_issues/2026-10-10-smoke-boot-extraction.md) | 已实施并验收通过（10 个 smoke 启动块迁 probe-web，两处钉值未动） | 2026-10-10 |
| [2026-10-10-proactive-wake-loop.md](settled_issues/2026-10-10-proactive-wake-loop.md) | 已实施并拍板 B（保持 ask+开局预热；机制全通：schedule 主动唤醒 + HITL 正确跳出） | 2026-10-10 |
| [2026-09-29-collab-mechanism-evidence.md](settled_issues/2026-09-29-collab-mechanism-evidence.md) | 消化；证据归消费卡与 probe | 2026-10-03 |
| [2026-09-29-date-channel-mechanism.md](settled_issues/2026-09-29-date-channel-mechanism.md) | 已实施并获追认 | 2026-10-03 |
| [2026-09-29-deliverables-lifecycle-metadata.md](settled_issues/2026-09-29-deliverables-lifecycle-metadata.md) | 已实施并记录于 Note | 2026-10-03 |
| [2026-09-29-writing-collab-locks-redis.md](settled_issues/2026-09-29-writing-collab-locks-redis.md) | 已实施并记录于 Note | 2026-10-03 |
| [2026-10-02-deferred-verifications.md](settled_issues/2026-10-02-deferred-verifications.md) | 验证债已判收 | 2026-10-05 |
| [2026-10-02-feedback-channel-cultivation.md](settled_issues/2026-10-02-feedback-channel-cultivation.md) | 推敲已结；后续另立项 | 2026-10-03 |
| [2026-10-04-cross-process-shared-disk.md](settled_issues/2026-10-04-cross-process-shared-disk.md) | 用户选择协调面方案 | 2026-10-04 |
| [2026-10-04-doc-snr-cleanup-audit.md](settled_issues/2026-10-04-doc-snr-cleanup-audit.md) | 审计与当轮处置已完成 | 2026-10-04 |
| [2026-10-04-human-agent-unity-ux-bdd.md](settled_issues/2026-10-04-human-agent-unity-ux-bdd.md) | 已实施首批方案 | 2026-10-04 |
| [2026-10-04-multi-user-concurrency-bdd.md](settled_issues/2026-10-04-multi-user-concurrency-bdd.md) | 已实施首批方案 | 2026-10-04 |
| [2026-10-04-work-status-visibility.md](settled_issues/2026-10-04-work-status-visibility.md) | 用户确定可见性方向 | 2026-10-04 |
| [2026-10-05-repository-steerability.md](settled_issues/2026-10-05-repository-steerability.md) | 六条工作已分别交付；一项延后触发留 owner | 2026-10-05 |
| [2026-10-06-driver-surface-package.md](settled_issues/2026-10-06-driver-surface-package.md) | 五项全部交付；决定稿已删，历史在 git | 2026-10-06 |
| [2026-10-09-postmortem-guard-survival.md](settled_issues/2026-10-09-postmortem-guard-survival.md) | 不新增通用存活机制；按需 owner 验证，重大重构时人工对照 | 2026-10-10 |
| [2026-10-09-decision-ledger-home-migration.md](settled_issues/2026-10-09-decision-ledger-home-migration.md) | D1–D9 保留 design 路由；不迁 Note、不为此提额 | 2026-10-10 |
| [2026-10-09-stale-pointer-cleanup.md](settled_issues/2026-10-09-stale-pointer-cleanup.md) | 不单独清理祖父存量；按需修实际阻断导航的指针 | 2026-10-10 |
| [2026-10-09-collaboration-safety-acceptance.md](settled_issues/2026-10-09-collaboration-safety-acceptance.md) | 四问裁决均 A；维持现行合同＋裁2/裁4 文档化申请（待用户授权） | 2026-10-10 |
| [2026-10-11-plain-language-human-exits.md](settled_issues/2026-10-11-plain-language-human-exits.md) | 已实施并验收（人话出口规范：摘要来源治理 + 阻塞/非阻塞/表达行为证据） | 2026-10-11 |
| [2026-10-11-human-exits-expression.md](settled_issues/2026-10-11-human-exits-expression.md) | 已实施并验收（表达层：台账全文入口、compact 显示模式、open-in-app 现场链路） | 2026-10-11 |
| [2026-10-11-human-exits-replay-scene.md](settled_issues/2026-10-11-human-exits-replay-scene.md) | 已建成并零 diff 复演（阻塞拍板 replay 场景 + 场景级浏览器答题人） | 2026-10-11 |
| [2026-10-12-backlog-process-made-explicit.md](settled_issues/2026-10-12-backlog-process-made-explicit.md) | 已实施并验收（制度显性化：缺陷通道＋双轨状态生命周期＋agent 门牌＋门禁镜像互查；去向 = implemented Note） | 2026-10-12 |
| [2026-10-13-agent-cultivation.md](settled_issues/2026-10-13-agent-cultivation.md) | 已实施并验收（培养回路 C 路径首版：公司页培养入口＋记录闭环＋角色方法层跨会话生效；拍板三项与验证收据在卡；去向 = implemented Note D43） | 2026-10-13 |
| [2026-10-16-code-structure-round3.md](settled_issues/2026-10-16-code-structure-round3.md) | 已实施并验收（deliverables 拆「形状与身份 / 声明对账」两模块＋spec 一一对应＋触发线；导出普查守恒与四条红证在 Note；Item 2 留独立第二轮） | 2026-10-16 |
| [2026-10-16-all-in-ai-ceo-closeout.md](settled_issues/2026-10-16-all-in-ai-ceo-closeout.md) | 已拍板并实施 A+B（收口必须先 present 入手册；converge 拦未结审计发现）；本条真实收口仍归公司侧 | 2026-10-16 |
| [2026-10-19-issue-card-quality.md](settled_issues/2026-10-19-issue-card-quality.md) | 已结（A 内容收口执行：四卡当前态/修订史、blockedBy、README 薄索引、研究稿失效标记、成品台账拆卡、wire golden 订正）；B 以后做，C = 后续卡执行协议 | 2026-10-19 |
| [2026-10-19-company-panels-ux-priority.md](settled_issues/2026-10-19-company-panels-ux-priority.md) | 已结（用户拍：看板+依赖图 → 任务板 → 台账；成品台账已拆新卡；判据 = 证据可复用 × 影响 × 代价） | 2026-10-19 |
| [2026-10-19-board-dag-ux-deep-dive.md](settled_issues/2026-10-19-board-dag-ux-deep-dive.md) | 已结（新鲜度文案说真话 + DAG 进行中徽章独立样式 + 窄栏/长链实测；用户接受 pane 自身纵向滚动；真 21 节点整页双滚动留未执行） | 2026-10-19 |
| [2026-10-20-fresh-agent-repo-hygiene.md](settled_issues/2026-10-20-fresh-agent-repo-hygiene.md) | 已结（两轮六维度审计 + 全部发现修复：P0 反馈通路〔BUG-030/031 + replay 注入面闭环〕、P1–P4 语义/结构/测试/常驻层、notes 归档 31 篇、手册重构 187→154 行；已接受取舍登记 = Phase B–F Note；六维度评分报告随对话交付） | 2026-10-21 |
| [2026-10-19-taskboard-table-ux-deep-dive.md](settled_issues/2026-10-19-taskboard-table-ux-deep-dive.md) | 已结（依赖列 owner · subject + id 次要；行 id 并入任务列；已删死映射移除；入口探针 1440/390 PASS） | 2026-10-19 |
| [2026-10-19-ledger-ux-deep-dive.md](settled_issues/2026-10-19-ledger-ux-deep-dive.md) | 已结（40 行 = parseMotionLedger 真文件；全文入口 16/27；刷新 30s；人读 60s/5 步/复述难/总体还行 → 接受） | 2026-10-19 |
| [2026-10-24-run-bundle-clean-base.md](settled_issues/2026-10-24-run-bundle-clean-base.md) | 已实施并交付（run bundle = 安装单元：bundle.json + 整盘去 tracked + 哈希升级 + 0.3.0 分发；证据 = implemented Note） | 2026-10-24 |
| [2026-10-19-deliverables-ledger.md](settled_issues/2026-10-19-deliverables-ledger.md) | 已结（成品目录 = 生成索引 kb/deliverables-index.json + 只读第 9 页签；44 份/活跃 5/归档 39/台账外 5；present 审计仍归 deliverables-check） | 2026-10-19 |
| [2026-10-17-cultivation-gui-actions.md](settled_issues/2026-10-17-cultivation-gui-actions.md) | 已实施；培养 GUI 行动面的 UX 推敲（时刻地图 / 输入清单把手审计 / 迭代框架 / 体验协议），去向 = 同名毕业 Note | 2026-10-17 |

## 已修缺陷

| 卡 | 标题 | 日期 |
|---|---|---|
| [BUG-001-manual-truncation.md](fixed_bugs/BUG-001-manual-truncation.md) | 公司手册超出注入预算导致尾部截断 | 2026-10-02 |
| [BUG-002-dual-ceo-silent-supersession.md](fixed_bugs/BUG-002-dual-ceo-silent-supersession.md) | 双 CEO 门静默易主 | 2026-10-06 |
| [BUG-003-present-no-role-gate.md](fixed_bugs/BUG-003-present-no-role-gate.md) | present 无角色门禁 | 2026-10-06 |
| [BUG-004-claim-yield-not-machine-readable.md](fixed_bugs/BUG-004-claim-yield-not-machine-readable.md) | 占位让位不可机判 | 2026-10-06 |
| [BUG-005-dual-signoff-single-door-routing.md](fixed_bugs/BUG-005-dual-signoff-single-door-routing.md) | 双签多门退化单签 | 2026-10-06 |
| [BUG-006-ceo-meta-vocab-drift.md](fixed_bugs/BUG-006-ceo-meta-vocab-drift.md) | CEO 产出 meta 词表漂移 | 2026-10-07 |
| [BUG-007-collaboration-probe-false-positives.md](fixed_bugs/BUG-007-collaboration-probe-false-positives.md) | 协作探针接受无操作/错误状态，且等待不存在的第2轮 | 2026-10-10 |
| [BUG-008-recon-pack-archive-drift.md](fixed_bugs/BUG-008-recon-pack-archive-drift.md) | recon-pack 存量判据漂移（归档件降 legacy-archive 观察项） | 2026-10-10 |
| [BUG-009-star-topology-no-lateral-channel.md](fixed_bugs/BUG-009-star-topology-no-lateral-channel.md) | 对账回合缺失：规则 + 行为验证（V4 红 → 新场景 CEO 双向转述） | 2026-10-11 |
| [BUG-010-scheduler-single-point-hitl-freeze.md](fixed_bugs/BUG-010-scheduler-single-point-hitl-freeze.md) | 调度单点：HITL 前排空规则 + 行为验证（V4 ask 先于建任务 → 新场景先建 10 任务） | 2026-10-11 |
| [BUG-011-instruction-carries-unverified-guess.md](fixed_bugs/BUG-011-instruction-carries-unverified-guess.md) | 指令夹带未证猜测：规则 + 派活行可选「假设」段（机器可读落点 + 解析断言） | 2026-10-11 |
| [BUG-012-same-model-hats-independent-review-overclaim.md](fixed_bugs/BUG-012-same-model-hats-independent-review-overclaim.md) | 同模五帽：5 份模板加「复核独立性层级 + 边际宽度」两栏 + keyless 断言 | 2026-10-11 |
| [BUG-013-e2e-driver-token-committed.md](fixed_bugs/BUG-013-e2e-driver-token-committed.md) | 观察窗 token 随无关 e2e driver 入库：untrack + .gitignore 显式规则（token 重启轮换，无历史重写） | 2026-10-12 |
| [BUG-015-charter-backfill-evidence-date-coupling.md](fixed_bugs/BUG-015-charter-backfill-evidence-date-coupling.md) | backfill 证据路径写死运行日：按 slug 解析真实收敛目录 + fail-loud | 2026-10-12 |
| [BUG-014-charter-backfill-dedupe-false-skip.md](fixed_bugs/BUG-014-charter-backfill-dedupe-false-skip.md) | backfill 子串查重假跳过：查重改条目行锚，COO 缺失条目补登 | 2026-10-12 |
| [BUG-016-converge-self-description-drift.md](fixed_bugs/BUG-016-converge-self-description-drift.md) | converge 自述三处失真：参数唯一源归工具头注（未知旗标 fail-loud）+ 文案对齐 journal-only 与 --charter-backfill | 2026-10-12 |
| [BUG-017-record-hygiene-residue.md](fixed_bugs/BUG-017-record-hygiene-residue.md) | 记录残留：归档卡计数统一、stray 断链删、台账叙述校正、补 convergence implemented Note | 2026-10-12 |
| [BUG-018-authorship-instance-preset-false-positive.md](fixed_bugs/BUG-018-authorship-instance-preset-false-positive.md) | 署名审计把同角色多实例 preset（coo vs coo-2）判成署名不实：写入者归属补基础角色规范化，真盘 10 条假阳性清零 | 2026-10-16 |
| [BUG-020-converge-crash-untracked-journal.md](fixed_bugs/BUG-020-converge-crash-untracked-journal.md) | 收敛半态可续跑：清 journal 判 tracked（未跟踪不再致崩）＋converge --resume（只做剩余步骤） | 2026-10-16 |
| [BUG-019-final-present-evidence-lost.md](fixed_bugs/BUG-019-final-present-evidence-lost.md) | 判据加证据可得性声明（--evidence-from）：证据不可考降观察档、不声明照旧判红；首版「证据丢失」诊断经深挖推翻为真阳性 | 2026-10-16 |
| [BUG-021-ask-user-question-no-scripted-answer-path.md](fixed_bugs/BUG-021-ask-user-question-no-scripted-answer-path.md) | 问询能自行收口：五角色 preset 钉 `tool-ask-user` 的 timed 形态（legacy 无界前台窗 ⇒ RPC 只吃 continued ⇒ 驱动永久挂起丢活） | 2026-10-18 |
| [BUG-022-ask-user-unbounded-timeout-override.md](fixed_bugs/BUG-022-ask-user-unbounded-timeout-override.md) | 驱动侧停点判定：问询无配对结果时分类"有界等待/无界卡死/逾期"，看到无界就停并报（模型传 `timeout: -1` 那条路） | 2026-10-18 |
| [BUG-024-cultivation-row-loses-action-after-failure.md](fixed_bugs/BUG-024-cultivation-row-loses-action-after-failure.md) | 失败后按钮卡「处理中…」：真根因=命令面可永不回话（`finally`+20s 截止边修好）；另修**验收仪器**竞态（断言要等收口，别在 t≈0 抓快照） | 2026-10-19 |
| [BUG-025-ledger-reads-wrong-data-face.md](fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) | 台账数据面口径错配：面板读的是 40 行动议表，调研与四卡把「993 份成品」记在台账名下 ⇒ 订正文档口径 + 补一条钉住「数据面 = `kb/motion-ledger.md`」的判据 | 2026-10-19 |
| [BUG-027-false-dependency-ready-badge.md](fixed_bugs/BUG-027-false-dependency-ready-badge.md) | 依赖徽章不看 status ⇒ 131 枚「等 …」噪声挂在已完成/进行中的卡上；**卡上原根因（`ready ?? readyOf()` 回落）经实证不可达**，真缺陷是渲染门槛 ⇒ 门槛加 pending 判据 + 回落补 pending 半句 + 两条 keyless 判据 | 2026-10-19 |
| [BUG-028-pending-material-anchor-granularity.md](fixed_bugs/BUG-028-pending-material-anchor-granularity.md) | 闸门④锚粒度与纪律不一致——总锚覆盖多任务被判行动幻觉 | 2026-10-19 |
| [BUG-029-committed-web-token-recurrence.md](fixed_bugs/BUG-029-committed-web-token-recurrence.md) | 观察窗 token 再次随 runtime 日志入库：untrack + `.gitignore` + 类级 tracked-token 窄扫（值不打印）+ 红绿守卫 | 2026-10-20 |
| [BUG-030-diagnose-approval-outcome.md](fixed_bugs/BUG-030-diagnose-approval-outcome.md) | diagnose 审批判读字段错位（读想象键读不到 outcome）：按真 v4 形状判读 + asked/decided 按 id 配对 + 夹具取真日志样 | 2026-10-20 |
| [BUG-033-revoke-recovery-body-edit-loss.md](fixed_bugs/BUG-033-revoke-recovery-body-edit-loss.md) | revoke 恢复把“已撤销 + 用户后改正文”回滚成旧全文：journal 目标态 + 第三态 conflict | 2026-10-27 |
| [BUG-032-r3-rerecord-not-replayable.md](fixed_bugs/BUG-032-r3-rerecord-not-replayable.md) | r3 重录不可重放（委派通知到达竞态）：`--record` 自检 + ≤3 次重录；失败保留现场 | 2026-10-23 |
| [BUG-031-orient-scenario-children-file-shape.md](fixed_bugs/BUG-031-orient-scenario-children-file-shape.md) | orient --scenario 对 children 文件形状 ENOTDIR 崩：statSync 分流（文件计 1 / 目录数 .jsonl） | 2026-10-20 |

| [BUG-034-no-absolute-time-source-for-signed-records.md](fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md) | 记录可举证必须有时间源：SA/SQA skill 必查 + 审计 Q8/Q10 + E2E v8 验收 | 2026-11-07 |
| [BUG-035-short-circuit-withstand-undefined.md](fixed_bugs/BUG-035-short-circuit-withstand-undefined.md) | 通流/承力路径必须有故障电流耐受：SA/SQA skill 必查 + 审计 Q9/Q11 + E2E v8 验收 | 2026-11-07 |
| [BUG-036-workflow-schema-enum-type.md](fixed_bugs/BUG-036-workflow-schema-enum-type.md) | workflow schema 子集：enum/const 需单值 type、无 type 数组；skill 四条 + 合同钉子 `tests/harness/contract/json-schema-subset.spec.ts` | 2026-11-08 |
| [BUG-039-workflow-result-truncation-lossy-spill.md](fixed_bugs/BUG-039-workflow-result-truncation-lossy-spill.md) | >50k 结果先截断再落盘：preset 抬 maxResultChars 到 200k，spill 全文可读；探针 71,677 字符 + 渲染钉子 | 2026-11-08 |
| [BUG-037-root-team-tool-shadowing.md](fixed_bugs/BUG-037-root-team-tool-shadowing.md) | 根门被团队版控制名 shadow：新增 `list_subagents` / `send_to_subagent`（官方服务、不被 shadow）+ 合同/技能同步 | 2026-11-08 |
| [BUG-038-workflow-branch-nested-delegation-result.md](fixed_bugs/BUG-038-workflow-branch-nested-delegation-result.md) | 分支内再委派返回值混回执：分支当叶子规则 + 真跑自纠观察 + 机制钉子（回执拼接） | 2026-11-08 |
| [BUG-041-host-restart-orphans-inflight-child.md](fixed_bugs/BUG-041-host-restart-orphans-inflight-child.md) | 重启后 in-flight child 成孤儿：`list_subagents` 带 durable `lastTurnEnd`（interrupted）+ ops 部署前置 | 2026-11-08 |
| [BUG-040-workflow-schema-text-answer-discarded.md](fixed_bugs/BUG-040-workflow-schema-text-answer-discarded.md) | schema 分支丢文本：产品规避（分支禁 schema、单行 JSON + 父 parse）+ smoke 第 7 条；引擎诊断仍缺 | 2026-11-08 |
| [BUG-043-list-subagents-includes-teammates.md](fixed_bugs/BUG-043-list-subagents-includes-teammates.md) | teammate 混入 subagent 列表：行加 role/address（队名/session id）+ description/skill 两套寻址；keyless 14 条 | 2026-11-08 |
| [BUG-044-background-job-lost-on-restart.md](fixed_bugs/BUG-044-background-job-lost-on-restart.md) | 后台 job 不跨重启：新增 `workflow_runs` durable 视图（lost+running+children）；keyless 6 条 + 真实 C7b 日志离线验证 | 2026-11-08 |
| [BUG-042-list-subagents-lastturnend-missing.md](fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md) | `lastTurnEnd` 恒缺：换 sessionPersistence 读 + open-turn 推断 interrupted（inferred-open-turn）；keyless 20 条 + C2f 真实验证 | 2026-11-08 |
| [BUG-045-subagent-retry-depth-budget-bypass.md](fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md) | retry 绕过行级深度：注册面/深度单源（`SUBAGENT_RETRY_SURFACE` = 通用 `subagent` 行）+ 越界 `depth-exceeded` 不起 child；keyless 红→绿 | 2026-11-09 |
| [BUG-049-model-contract-retry-drift.md](fixed_bugs/BUG-049-model-contract-retry-drift.md) | 模型声明漂移：合同 `delivered`/`merged` + `carrierPath`；`retrySurface()` 派生注册面/深度；parity spec 钉运行时/YAML/模型三边 | 2026-11-09 |
| [BUG-047-worker-family-handbook-scope.md](fixed_bugs/BUG-047-worker-family-handbook-scope.md) | handbook 边界按 worker family 派生（三个 profile 都不注入）；默认取 family，配置只作覆盖；keyless 按 preset 断言 | 2026-11-09 |
| [BUG-046-parent-cannot-verify-child-preset-depth.md](fixed_bugs/BUG-046-parent-cannot-verify-child-preset-depth.md) | `list_subagents` 从 child durable header 暴露 `agentPreset`/`delegationDepth`（十进制字符串），读不到显式 `unavailable`；keyless 红→绿 | 2026-11-09 |
| [BUG-048-ui-golden-brand-name-drift.md](fixed_bugs/BUG-048-ui-golden-brand-name-drift.md) | 金样随 D14 显示名收窄刷新（`--refresh-golden` 后 `--golden` 绿）；tests/README 的 `src/lib` 读模型行补“显示名 → 同 diff 金样”映射；不升门禁 | 2026-11-09 |
| [BUG-050-retry-depth-fix-fails-in-real-assembly.md](fixed_bugs/BUG-050-retry-depth-fix-fails-in-real-assembly.md) | 复核为**环境陈旧误报**：dev profile 旧安装副本，`plugin add link:` 当前源码后 CMO depth 2 正常 `depth-exceeded`；教训 = 真入口探针前确认 profile = 当前源码/构建 | 2026-11-09 |
| [BUG-051-worker-orchestrator-leaf-cap-contract.md](fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md) | fan-out 改成父代理 brief 预算（模型 `fanOut: parent-brief`，preset 去掉“1–2”硬数字）+ spec 钉文案；4-task 真装配仍 4 leaf（观察） | 2026-11-10 |
| [BUG-052-worker-leaf-control-surface.md](fixed_bugs/BUG-052-worker-leaf-control-surface.md) | control 工具 per-agent 安装，worker family 不装；真装配 alpha 工具目录 21 个、无 control；sibling 注入仍被运行时拒 | 2026-11-10 |
| [BUG-053-cancel-does-not-abort-subagent-retry.md](fixed_bugs/BUG-053-cancel-does-not-abort-subagent-retry.md) | `abortable` race + `ctx.subagents.interrupt(child)`；cancel 后 35ms root/child `aborted`、无 sleep 残留；keyless + 真装配 | 2026-11-10 |
| [BUG-026-owner-missing-from-team-projection.md](fixed_bugs/BUG-026-owner-missing-from-team-projection.md) | 误报证伪（wire 视图 ownerName 齐全，卡读的是 projcache state 行）→ 防复发判据 = `tests/lib/board.spec.ts` 真 wire 形状断言；2026-11-09 由 `settled_issues` 改归本表 | 2026-10-19 |
| [BUG-023-cultivation-float-actions-dead.md](fixed_bugs/BUG-023-cultivation-float-actions-dead.md) | 误报证伪（浮窗正常；真凶 = 探针跨轮复用 id 撞遗留方法目录）→ 修复落探针卫生，S4b 恢复硬判 PASS；2026-11-09 由 `settled_issues` 改归本表 | 2026-10-18 |

## 暂停卡

目前无问题卡或缺陷卡停放于对应归档目录。

## 退役历史池

| 文件 | 原用途 | 日期 |
|---|---|---|
| [suspended.md](legacy/suspended.md) | 退役的旧搁置池 | 2026-09-28 |
| [polish.md](legacy/polish.md) | 退役的旧磨清单 | 2026-09-28 |
