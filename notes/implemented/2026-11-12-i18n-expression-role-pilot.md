# 2026-11-12 · i18n 表达层角色名 + I1 pilot + 英文棘轮

状态：implemented（2026-11-12；切片交付，不代表 I1/I2/I3 完成）
上游 = [表达层 RFC](../proposed/2026-11-12-bilingual-company.md) · [内部全英文 RFC](../proposed/2026-11-12-internal-english-canonical.md)

## 决定

1. **角色名 = 表达层，canonical 英文**：role id + 英文名住 `src/lib/role-copy.ts`；
   zh 可见名用 `CEO · 首席执行官` 混排，en 用 `CEO`；徽标/窗口标题用短标签（CEO/VPE/VPS）；
   委派卡用 `VP-Eng · 研发` / `VP-Eng · Engineering`。数据/日志/API/preset id 不变。
2. **不再问用户角色名细节**：视觉统一 + 一眼看懂；picker name 用英文缩写，六个公司角色
   description 用中英混排一行；support preset 英文。不做 per-locale picker。
3. **内部英文单份，不做双语副本**：`content/zh` + `content/en` 是两本账，否；中文是表达层
   输出语言，由 policy 表达。兼容不是设计约束。
4. **I1 用棘轮推进**：`tests/presets/internal-english.spec.ts` 扫全部 `presets/**/SKILL.md`；
   `PENDING` 之外不得含中文。每翻完一个删一行，最终 `PENDING` 为空 = 硬门禁。
5. **method-contract 接受中英契约块**：英文 `**Method contract**` / `applicable product types` /
   `required facts`；中文块继续绿，不搞两套门禁。

## 输掉的方案

- **表达层也全英文**：放弃中文默认与中文表达；否。
- **内部中英双份**（`content/zh` + `content/en`）：两本账，翻译/审校/门禁翻倍；否。
- **picker 按语言双语双行/切换**：上游无 per-locale 机制；接受“英文 name + 混排 description”
  这一统一形态；否。
- **保留中文内部 canonical + 英文 overlay**：内部仍是混合态；用户明确否。
- **一次性翻完 24 个 skill 再测**：质量与回归都不可控；改用 pilot + 棘轮，逐批推进。

## 验证

- 角色名：`role-copy.spec` 6 角色 zh/en/未知/委派映射；RoleBadge / DelegationCard /
  Presence / Tasks / Board / Cultivation 子块 / context picker / host `/cultivation` 回执
  静态/纯函数断言；`ui-scene-smoke --isolated --golden` ALL PASS。
- I1 pilot + 第二/三批：`customer-voice`、`tech-feasibility-review`、`pricing`、
  `managed-service-pricing`、`market-sizing`、`managed-service-ops`、`budget-check`、
  `finance-compliance`、`ops-workflow`、`cfo-workflow`、`managed-service-economics`、
  `eng-workflow`、`sales-workflow`、`delegation-policy`、`ops-feasibility`、`project-economics`、`mrd-playbook`、`prd-playbook`、`eng-teaming` 英文单份；
  `tests/presets` 132 passed；`preset-smoke` ALL PASS（11 preset 可挂载）。
- 棘轮红→绿：给 pilot 追加中文 → 2 条红；还原 → 绿。
- 门禁红→绿：pilot 的 `applicable product types` 改成 `nope` → 红（点名文件 + 无类型包 +
  未覆盖默认类型）；还原 → 绿。中文契约块仍绿。
- 全量：`pnpm test` 207 files / 1630 tests passed；`typecheck` 0；`lint` 0；`dup` 0。
- 外部红（非本切片）：工作树另有两个并行研究材料正在写，`pnpm verify` 有
  md-newline / md-links / bare-path / pin-currency / tracked-portability 红；未触碰、未纳入 commit。

## I1b 第一片（meta 字段）

- `productType:` / `deliveryMode:` 成为 meta canonical；解析器只认英文；旧中文字段被忽略。
- 测试：中文-only 字段回落默认（红→绿）；`delivery-mode-sources` 门禁改查 `deliveryMode:`，模板回退中文 → 红，还原 → 绿。
- `pnpm test` 207 files / 1631 tests；`preset-smoke` ALL PASS。

## I1b 第二片（升级标记）

- `【待澄清】` → `[NEEDS-CLARIFICATION]`；`ESCALATION_MARK`、attention 注释、generic collaboration、assembling 词面同步。
- attention spec 加字面量断言；改回中文 → 1 条红，还原 → 10 passed。
- `pnpm test` 207 files / 1633 tests；`preset-smoke` ALL PASS。

## I1b 第三片（日期占位）

- `日期待核` → `date-pending`；work-handoff / chairing / ledger / converge / deliverables audit / base-clean 同步。
- base-clean 注入 `date-pending` → 红，还原 → 绿；`pnpm test` 207 files / 1633 tests；`preset-smoke` ALL PASS。

## I1b 第四片（派活行 + 待补料锚）

- `派活｜…｜依赖：…｜状态：…` → `ASSIGN｜…｜deps: none｜status: todo`；`待补料·` → `pending-sources·`。
- 同步 parser / audit / content / chairing/assembling/fact-finding / 测试。
- 回退 parser 到中文 → candidate-scan spec 17 条红；还原 → 27 passed。
- `pnpm test` 207 files / 1634 tests；`preset-smoke` ALL PASS。

## I1b 第五片（事实/假设标签）

- 中文事实/假设标签 → `[fact]/[assumption]`；模板、cmo charter、product-definition、hardware reference、docs 同步。
- `tests/content/fact-labels.spec.ts` 棘轮：中文标签回潮 → 红；还原 → 绿。
- I1b 机器 token 清单已清；`pnpm verify` ALL PASS；`pnpm test` 207 files / 1636 tests。

## I1 第九批（fact-finding / product-definition）

- `fact-finding-playbook` 与 `product-definition` 翻成英文；I1 21/24。
- 剩余 `assembling-the-team` / `chairing-staff-meeting` / `quality-loop`。
- `pnpm test` 207 files / 1636 tests；`preset-smoke` ALL PASS；`pnpm verify` ALL PASS。

## I1b 补遗：署名/认领 token

- 翻译 assembling 时发现 `出稿：<role>｜版本 v<N>｜任务书 = <path>` 被 `authorship.mjs`/`DRAFT_VERSION`/audit 消费；`让位=认领撤销，非出稿`/`占位=认领，非出稿` 被 `deliverables.mjs` 消费。
- 这些不在最初 token 清单内；assembling/chairing 暂缓，quality-loop 可先翻。
- 此前“I1b token 清零”只指原清单，需补做署名/认领 token 切片。

## I1b 补遗：署名行 canonical

- `出稿：<role>｜版本 vN｜任务书 = ...` → `By: <role>｜Version vN｜Brief = ...`；`SIG`/`DRAFT_VERSION` 接受 canonical，旧形状兼容。
- `work-handoff`、`assembling`、`presets.spec`、`authorship.spec` 同步；canonical 字面量红→绿 1 条。
- `让位/占位` 行仍未清，但不在 assembling/chairing 中；这两个 skill 可进入全文翻译。
- `pnpm test` 207 files / 1637 tests；`pnpm verify` ALL PASS。

## I1 第十批（assembling-the-team）

- assembling-the-team 翻成英文；I1 22/24。
- 剩余 chairing-staff-meeting / quality-loop。
- `pnpm test` 207 files / 1637 tests；`preset-smoke` ALL PASS；`pnpm verify` ALL PASS。

## I1 第十一批（chairing-staff-meeting）

- chairing-staff-meeting 翻成英文；I1 23/24。
- 剩余 quality-loop。
- `pnpm test` 207 files / 1637 tests；`preset-smoke` ALL PASS；`pnpm verify` ALL PASS。

## I1c 阻断：quality-loop 处置 token

- `已修/反驳/接受` 被 `tools/lib/quality-loop.mjs` `DISPOSITION_VALUES` 解析；`接受人：` 被 acceptor 检查；`未复验` 被 warning 正则消费；`body-sha256=待填` 由回填脚本处理。
- 这些都是机器合同，quality-loop 暂缓翻译；先做 I1c token 切片。

## I1c（quality-loop 处置 token）

- 处置枚举 → fixed/rebut/accept；accepted-by:；unverified；parser/audit/skill/测试同步。
- 回退 DISPOSITION_VALUES 到中文 → quality-loop.spec 10 条红；还原 → 40 passed。
- quality-loop 全文仍中文，仍 PENDING；`pnpm test` 207 files / 1637 tests；`pnpm verify` ALL PASS。

## I1 skill 正文完成

- quality-loop 全文英文；Checklist 段名中英双认；棘轮 PENDING 清空。
- `presets/**/SKILL.md` 24/24 英文；`pnpm test` 207 files / 1637 tests；`preset-smoke` ALL PASS；`pnpm verify` ALL PASS。
- 剩余：让位/占位 token、persona/content/领域值、I2/I3。

## I1d（claim/yield）

- 占位/让位首行 → claim=acknowledged/yield=claim withdrawn；parser/audit/content/docs/测试同步。
- 回退常量到中文 → 4 条红；还原 → 41 passed。
- meta 形状字段仍是中文机器面，随 content/领域值切片处理。
- `pnpm test` 207 files / 1637 tests；`pnpm verify` ALL PASS。

## I1e 第一片（meta type/result）

- 类型/结果字段与枚举英文化；catalog/audit/converge/模板/测试同步。
- boutique 表达层：catalog type/result 字典 + host resultLabelFor。
- `pnpm test` 208 files / 1638 tests；`pnpm verify` ALL PASS。

## I1e 第二片（numbering/layers）

- 编号体系 → numbering；需求层 → layers；requirements-check/req-command/模板/文档/测试同步。
- 旧中文标记被忽略（skipped）；回退 regex → 5 条红；还原 → 20 passed。
- `pnpm test` 208 files / 1639 tests；`pnpm verify` ALL PASS。

## I1e 第三片（participants/wallClock/summary/events）

- meta 剩余字段英文化；catalog/converge/parseMeta/模板/测试同步。
- meta 字段全集英文；`pnpm test` 208 files / 1639 tests；`pnpm verify` ALL PASS。

## I1f persona pilot（CFO）

- CFO persona 英文；persona 棘轮 PENDING 10。
- 注入中文 → 2 条红；还原 → 绿；`pnpm test` 208 files / 1641 tests；preset-smoke ALL PASS；verify ALL PASS。

## I1f 完成（全部 persona）

- 11/11 persona 英文；persona 棘轮 PENDING 清空。
- `pnpm test` 208 files / 1641 tests；`preset-smoke` ALL PASS；`pnpm verify` ALL PASS。
- 剩余 content/**、领域值、I2/I3。

## I1g content pilot（decision-memo）

- decision-memo 模板英文；template 棘轮 PENDING 7。
- 注入中文 → 2 条红；还原 → 绿；`pnpm test` 208 files / 1643 tests；verify ALL PASS。

## P0 UI 第一批（待办 + PanelFrame）

- 待办页签、PanelFrame 浮出/收回、attention 类别标签迁 company 字典；移除中文 `attentionLabel` 纯函数。
- zh/en 静态渲染 spec；client 370 tests；ui-scene-smoke 9 页签金样 ALL PASS；全量 1645 tests，verify ALL PASS。

## P0 UI 第二批（任务板）

- 任务板页签/表格/头部入口迁 tasks.* 字典；列名/状态/阻塞/未分配/空态/依赖缺失全部 t。
- header action 注册 locale，en 下入口不裸中文；client 371 tests；金样 9 页签 ALL PASS；全量 1646 tests，verify ALL PASS。

## P0 UI 第三批（看板/DAG）

- 看板列/空列/依赖就绪/等待/drift、DAG 状态徽章/空态/重画迁 board.*/dag.* 字典。
- 移除 UI 对中文 driftLabel 的依赖（lib 仍保留旧函数，UI 改字典）。
- en 静态渲染断言；client 373 tests；金样 9 页签 ALL PASS；全量 1648 tests，verify ALL PASS。

## P0 UI 第四批（在场/用量）

- 在场状态/aria/空态/协作动态标题、用量轮次/步数/工具占比/四路行迁 presence.*/budget.*。
- Budget UsageRow 加稳定 id，UI 不按中文 label 映射。
- en 静态渲染断言；client 375 tests；金样 9 页签 ALL PASS；全量 1650 tests，verify ALL PASS。
- 协作动态 entry.text 仍是 lib 中文，留下一批结构化 token。

## P0 UI 第五批（协作动态 token）

- ActivityEntry 加 token；diffActivity/presenceFromEvents 全部成员/任务事件带 key+params。
- PresenceTab/PresencePanel 用 activityText 渲染 token；旧 text 保留给夹具/离线。
- en 静态渲染断言不再显示中文 text；client 376 tests；金样 9 页签 ALL PASS；全量 1651 tests。

## P0 UI 第六批（台账）

- LedgerTab/LedgerSummary 迁 ledger.*；标题/刷新/统计/aria/成品标记/维护/全文入口。
- 台账 kind 中文值走 catalog.type.* 映射；LedgerSummary t 默认 zh，旧测试不破。
- en 静态渲染断言；client 377 tests；金样 9 页签 ALL PASS；全量 1652 tests，verify ALL PASS。

## P0 UI 第七批（成品）

- DeliverablesView/DeliverablesTab 迁 deliverables.*：统计/筛选/空态/分组/行 aria/标签/打开/footer/索引错误。
- LedgerSummary 传 t；默认 t 带插值，旧 zh 测试不破。
- en 静态渲染断言；client 378 tests；金样 9 页签 ALL PASS；全量 1653 tests，verify ALL PASS。

## P0 UI 第八批（工具卡/委托卡）

- DelegationCard/TeamToolCard 迁 delegation.*/teamCard.*；状态/抬头/展开收起/结果/轨迹。
- TeamToolCard 加 title/detail token（纯函数保留中文 title 给旧测试）；toolview 注册 locale。
- en 静态渲染断言；client 379 tests；金样 9 页签 ALL PASS；全量 1654 tests，verify ALL PASS。

## P0 UI 第九批（培养视图壳）

- CultivationView 的 eyebrow/title/sub/公司总览/拖拽 aria 迁 cultivation.*。
- 培养主体 CultivationBoard/Inbox/Chat/Compose 与 CULTIVATION_COPY 仍中文；下一批处理。
- client 379 tests；金样 9 页签 ALL PASS；全量 1654 tests，verify ALL PASS。

## P1 模板完成（8/8）

- prd/meta 模板英文；PRD 正文标题改 Requirement:，测试同步。
- content template 棘轮 PENDING 清零；全量 1654 tests，verify ALL PASS。

## P0 UI 第十批（培养文案表）

- CULTIVATION_COPY 拆成 ZH/EN 两份 + Proxy；CultivationView 按 meta.language 设置。
- Board/Inbox/Chat/Compose 的 72 处引用不变，自动跟随语言；函数签名保留。
- 新增 cultivation-copy.spec；client 381 tests；金样 9 页签 ALL PASS；全量 1656 tests，verify ALL PASS。

## P0 UI 第十一批（培养 Inbox）

- CultivationInbox 的标题/空态/读不动/未展开/行 aria/提案者/来源/背景/正文摘要/命令回执迁 CULTIVATION_COPY。
- copy 表新增 inbox* 函数型 key；zh/en 代理测试覆盖。
- client 381 tests；金样 9 页签 ALL PASS；全量 1656 tests，verify ALL PASS。

## P0 UI 第十二批（Journal/Feedback）

- 培养 Journal 素材与人的赞/踩块迁 CULTIVATION_COPY（journal*/feedback*）。
- copy 表新增函数型 key；zh/en 代理测试覆盖。
- client 381 tests；金样 9 页签 ALL PASS；全量 1656 tests，verify ALL PASS。

## P0 UI 第十三批（Mine）

- CultivationMine 迁 mine* copy：标题/说明/行 aria/拒绝回执/状态/来源/背景/工作。
- cultivation-copy.spec 覆盖 en mineTitle/mineSuggestionFor；client 381 tests；金样 ALL PASS。

## P0 UI 第十四批（Adopted）

- CultivationAdopted 迁 adopted* copy：验证态/观察历史/原始依据/来源/撤回后缀/展开收起。
- cultivation-copy.spec 覆盖 en adoptedTitle/adoptedShowAll；client 381 tests；金样 ALL PASS。

## P0 UI 第十五批（Board 说明）

- CultivationBoard 的“我的分身/怎么养/熟手命令”迁 board* copy。
- cultivation-copy.spec 覆盖 en boardHow/boardCmdCheck；client 381 tests；金样 ALL PASS。

## P0 UI 第十六批（ChatPanel）

- CultivationChatPanel 迁 chat* copy：标题/副标题/提示/等待/创建/错误/空态/说话人/回复中/附加记录/输入/发送/工具行。
- cultivation-copy.spec 覆盖 en chatTitle/chatSend；client 381 tests；金样 ALL PASS。

## 暂缓 / 阻断

- `fact-finding-playbook`、`ceo/assembling-the-team`、`ceo/chairing-staff-meeting`、`_shared/product-definition` 含机器可读中文 token：`待补料·<slug>·<T号>`、`派活｜…｜状态：待办`、`产品类型/交付模式`、`【待澄清】`、`日期待核`、`【事实】/【假设】`。必须先做 I1b token 英文化 + 消费方改造，不能和普通文案一起盲翻。

## 后果 / 未做

- 角色名主表面与 host 回执已混排；数据仍是 canonical 英文。
- I1 还剩 5 个 skill（`quality-loop` + 4 个机器 token 阻断文件）、persona/agent.cordis.yml、`content/**`、领域值/picker 内部英文。
- I2（注释/日志/测试名英文 + 内部 CJK 门禁）、I3（开发者文档）未开始。
- 本 Note 只记录已交付切片；完整目标仍由两份 RFC 承载。
