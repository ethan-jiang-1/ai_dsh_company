# issues/ · 还没结束的问题

一文件一张卡。先找已有问题，用户点名后再推敲；缺陷记在 [bugs](../bugs/README.md)。流程与关闭条件在 [backlog 入口](../README.md)。

## 活跃清单

- [docs/ DSH 对齐：四个实质偏离怎么收](2026-11-10-docs-dsh-alignment.md) — 推敲中（decision-only）：design/ vs Agent Notes、index 第二清单、5% headroom、只写 now；含架构地图与 genre 混合。推荐顺序 = 14 值 → index tier map → design/ → genre → 5% 收口。
- [内容宪章：按寿命分层，按成本抽象](2026-11-10-content-charter.md) — 待落地：宪章正本 + doc/execution 双链入口 + 卡/Note 字段 + 入口门；核 = 新 agent 冷读能找到并答四问。
- [producer/verifier 质量环：独立上下文 + 外部方法层](2026-11-10-producer-verifier-quality-loop.md) — 待落地：两 support preset + VP-Eng 两行 + 共享 quality-loop skill + 方法槽 + 审计探针；一张卡（不拆），理由见卡内。
- [workflow + subagent 探索性测试 bug hunt](2026-11-08-workflow-subagent-exploratory-bug-hunt.md) — 推敲中：第四轮 5 张缺陷卡 BUG-045–049 已修复；修复后验证通过（keyless/挂载/UI golden + 真装配 retry/身份行/handbook）；BUG-050 复核为环境陈旧误报；用户 2026-11-09 晚指示继续探索；第五轮新发现 BUG-051（P2）、第六轮 BUG-052（P2）、第七轮 BUG-053（P1），**三张已于 2026-11-10 按 E/F 根因修复归档**（control per-agent + fan-out 诚实声明；abortable + interrupt）；depth 4 负例 / 重启后 retry+workflow 身份行 PASS；真页面 DagTab 仍未定位会话入口（harness-blocked，不伪造 PASS/FAIL）；未覆盖项见研究材料 §9.7–§9.9。

（2026-11-10 docs/ 分层重整卡已结归档：用户“都提交”＝接受；去向 = [Note](../../notes/implemented/2026-11-10-docs-layer-restructure.md)，卡片见[归档](../_archive/settled_issues/2026-11-10-docs-layer-restructure.md)。）

（2026-11-08 VP-Eng workflow 通道卡已结归档：去向 = [Note](../_archive/settled_issues/2026-11-08-vpeng-workflow-channel.md)；卡片见[归档](../_archive/settled_issues/2026-11-08-vpeng-workflow-channel.md)。）

（2026-11-08 README/手册使用者面向卡已结归档：去向 = [Note](../_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md)；卡片见[归档](../_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md)。）

（2026-11-08 SA/SQA 能力组织卡已结归档：去向 = [capability-routing Note](../../notes/archived/2026-11-08-sa-sqa-capability-routing.md)；
历史摘要只住[归档](../_archive/README.md)，本页不重复。）

（2026-11-07 需求识别/编号 + VP-Eng 组队的程序伞卡 + 11 张执行卡（A1–A8、B1/B2）已结归档：
去向 = [程序 Note](../../notes/archived/2026-11-07-requirements-teaming-program.md)；卡片见[归档](../_archive/settled_issues/README.md)。）


2026-11-07 程序卡 12 张（伞卡 + A1–A8 + B1/B2）已结归档：编号合同/五层模板/checker//req check/角色产出/迁移/E2E/组队
按 W0–W5 落地，证据在程序 Note 与各卡 `## 交付证据`；残余（跨动议键、并发锁、真会话 /req check 回执）写在 Note 剩余风险。

2026-11-03 两张打扫卡（第五轮 / 第六轮）均已结归档：改善按五道门落地，证据在各 Note；
残余项（npm publish 等外部依赖）在卡的「结论/去向」与归档材料里写清。

v3、生命周期、dev/产品路径 parity、FAQ 26 发行版对齐与 Trajectory/New terminal 收回卡均已结归档。已结卡见[归档索引](../_archive/README.md)。新问题按 [backlog 入口](../README.md) 立卡，不从归档里自行开工。

## 近期归档

- README/手册使用者面向卡 2026-11-08 已结：七问冷读 README 5.0→7.0/7、手册 5.0→7/7 + `readme-manual-commands` 门 + 2 张真实例截图；去向 = [Note](../_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md)；卡在[归档](../_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md)。

- SA/SQA 子人格卡 2026-11-06 已结：两个委派子人格（system-architect / system-qa）+ 委托行 maxDepth 2 + SQA 否决直达 CEO；真模型 E2E 证独立会话/preset/depth=2；去向 = [Note](../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)；卡在[归档](../_archive/settled_issues/2026-11-06-system-architect-sqa.md)。
- 第六轮七维打扫卡 2026-11-03 已结：fresh agent 复评 A-…A- + 层次化（client/tests/harness）+ 腐化通道四条机械面；去向 = [context-rot-guards Note](../../notes/archived/2026-11-03-context-rot-guards.md) 与各批 Note；卡在[归档](../_archive/settled_issues/2026-11-03-repo-hygiene-round6.md)。
- 第五轮七维打扫卡 2026-11-03 已结（消化）：A–F 各批已落地或被第六轮承接；残余 = npm publish（外部）与零入链分诊（已定性不批量迁）；卡在[归档](../_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)。

- Trajectory/New terminal 收回卡 2026-11-03 已结：pack 禁 `ui-trajectory` / `ui-sidebar-terminal` 两行，主区 = Chat + 培养、右栏无 New terminal，真页面 + 组合面双证据；去向 = [remove-trajectory-terminal-ui Note](../../notes/implemented/2026-11-02-remove-trajectory-terminal-ui.md)；卡在 [归档](../_archive/settled_issues/2026-11-02-remove-trajectory-terminal-ui.md)。

- FAQ 26 发行版对齐卡 2026-11-02 已结：术语/发布证据链/current docs 清理；0.7.1；去向 = [distribution-alignment Note](../../notes/implemented/2026-11-02-distribution-alignment.md)；卡在 [归档](../_archive/settled_issues/2026-11-02-harness-release-alignment.md)。
- dev/产品路径 parity 卡 2026-11-02 已结：默认 tarball + `--link` 快速通道 + parity 指南/门禁 + 市场 staged；去向 = [parity Note](../../notes/implemented/2026-11-02-dev-product-path-parity.md)；卡在 [归档](../_archive/settled_issues/2026-11-02-dev-product-path-parity.md)。

- 生命周期发布卡 2026-11-02 已结：0.7.0 发布就绪 + 本地 registry 按名安装演练 + market index 校验；公有 publish/托管 = [handoff](../../docs/guides/publish-handoff.md)；卡在 [归档](../_archive/settled_issues/2026-11-01-plugin-lifecycle-publish.md)。
- v3 产品化卡 2026-11-02 已结：0.7.0 复核通过（入口/workspace/内容/账本；原生 picker、不自动迁移写实）；去向 = [v3 Note](../../notes/implemented/2026-11-01-plugin-as-product-v3-native-entry.md)；卡在 [归档](../_archive/settled_issues/2026-11-01-plugin-as-product-v3.md)。
- 发布与文档卡 2026-11-01 已结：`_dist` 手册/README/docs/CI 验收落地；去向 = [v2 manifest Note](../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md)；卡在 [归档](../_archive/settled_issues/2026-11-01-release-and-docs.md)。
- 培养工作优先单入口卡 2026-10-30 已结：work 字段 + 单表单 + 实时预览落地；实施 = [case-entry Note](../_archive/settled_issues/2026-10-30-cultivation-case-entry.md)；卡在 [归档](../_archive/settled_issues/2026-10-30-cultivation-case-entry.md)。
- 培养入口收口卡 2026-10-30 已结：目标角色显式选择、入口文案、自纠正状态、验证历史逐条、对话失败保留草稿；实施 = [entry-followup Note](../_archive/settled_issues/2026-10-30-cultivation-entry-followup.md)；卡在 [归档](../_archive/settled_issues/2026-10-30-cultivation-entry-followup.md)。
- 培养 UX 卡 2026-10-29 已结：结论 = 做；案例工坊 A 主线、来源/决定/验证历史落地；实施 = [traceability Note](../../notes/archived/2026-10-30-cultivation-work-improvement-traceability.md)；卡在 [归档](../_archive/settled_issues/2026-10-29-cultivation-experience.md)。
- 二轮削洋葱卡 2026-10-28 已结：8 项残余 5 修 / 3 边界；0.4.1；实施 = [round2 Note](../_archive/settled_issues/2026-10-28-data-design-round2.md)；卡在 [归档](../_archive/settled_issues/2026-10-28-data-design-round2.md)。
- 数据设计硬化卡 2026-10-28 已结：结论=做；实施 = [data-design-hardening](../_archive/settled_issues/2026-10-28-data-design-hardening.md)；M1–M4 落地（0.4.0）；卡在 [归档](../_archive/settled_issues/2026-10-28-data-design-hardening.md)。
- run bundle 卡 2026-10-24 已结：按建议转 RFC 并实施，Note =
  [run-bundle-install-unit](../../notes/archived/2026-10-24-run-bundle-install-unit.md)；卡在
  [归档](../_archive/settled_issues/2026-10-24-run-bundle-clean-base.md)。
- 培养背景卡 2026-10-23 已交付归档：D1=A/D2=A；RFC 实施为
  [Note](../../notes/archived/2026-10-23-cultivation-context.md)，卡在
  [归档](../_archive/settled_issues/2026-10-23-cultivation-context.md)。
- fresh-agent-repo-hygiene 卫生审计卡（2026-10-21）已毕业归档：两轮审计 + 全部发现修复
  （P0–P4 + notes 归档 + 手册重构），收口记录 =
  [归档卡](../_archive/settled_issues/2026-10-20-fresh-agent-repo-hygiene.md) 与
  [Phase B–F Note](../../notes/archived/2026-10-21-followup-sweep-phases-b-f.md)。
- 此前六张卡（issue 卡质量 / 公司面优先级 / 看板+依赖图 / 任务板 / 台账 / 成品台账）均已归档，见
  [归档](../_archive/README.md)（含 agent-cultivation、workspace-convergence 与 ceo-minimal-assembly）。

## 边界与尺寸

卡的单位是**一个能说明的结果或待判问题**，不是一个技术主题、一个文件或一串任务。头部必须能读出期望结果、当前情况、未决问题、下一步；范围与排除项在讨论前写清。

- **简单问题**：几段话足以说明问题、结论与依据就简写，不强填全部章节。
- **正常问题**：围绕一个结果，记录事实、选择、范围、关闭条件；决定做的补验收标准。
- **大问题**：先在同卡保留粗粒度目标、判断依赖、尚未规定与范围外，只细化本轮讨论的分支。一次聚焦一个需要人判断的分支，独立事实查证可以并行。
- **何时拆卡**：能独立决定、独立关闭，且有不同结果或触发条件时考虑拆开；来源相同不意味着必须同卡。拆出内容保留来源链接，避免两个当前 owner。

分步确有必要时，每步写交付结果、验收和真实前提，仍留当前卡。小问题不发明分解；候选步骤不成为执行队列或实施授权。长证据移到 [research](../research/README.md)，短判断留卡；方法见 [澄清需求](../methods/requirements-elicitation.md) 与 [整理结论](../methods/requirements-synthesis.md)。

## 写一张卡

文件名 `YYYY-MM-DD-<slug>.md`。新卡可写 `Feature`（可观察行为改变）、`Task`（交出代码、文档、配置或结论）、`未定`；旧卡不强制回填类型。

```markdown
---
status: 推敲中
opened: YYYY-MM-DD
---

# 推敲：<标题>

> 立卡：YYYY-MM-DD ｜ 状态：推敲中 ｜ 类型：未定 ｜ 毕业：未定 ｜ 可关闭：否
>
> **结论/去向**：（关闭时写：结论 + `去向` 封闭值 — 落点；状态行只做镜像）

**问题与期望结果：** 触发、期望结果、如何判断本轮推敲完成。
**当前情况：** 已确认的事实与出处。
**未决问题：** 尚缺的事实或人的选择。
**下一步：** 谁来做什么，或等什么具体条件。

## 范围与排除项

## 已知与未决

## 方案与取舍

## 关闭条件
```

决定做的按 [验收设计](../methods/validation-design.md) 在同卡加 `## 验收标准`，同时把 `status` 翻 `待落地`、卡顶写 `去向`（`rfc｜note｜implementation`）——这三样齐了才算过了定性门，缺一样门禁红。这描述下游做成什么算合格，不要求未来检查已执行；`关闭条件` 不复制实施验收。

五道门与全部翻转规则唯一家 = [章程](../README.md)「五道门」「双轨状态生命周期」：门票 = **把问题说清 + 给出验收手段，由格式承载**（问题轨 = `待落地` 时 `## 验收标准`；缺陷轨 = `修复就绪` 时 `## 已修判定`）；`毕业：` 封闭头 `未定｜做｜以后做｜不做｜消化`；状态行镜像 frontmatter（门禁互查）。`待落地` **不是授权**——授权仍来自用户点名或已批 RFC。

## 关闭或叫停

按 [关闭条件](../README.md#关闭条件) 检查；翻转的守卫、谁翻、记录什么 = [章程](../README.md)「双轨状态生命周期」翻转表。需要后续处理的提交申请并记录去向；授权由用户裁决，RFC/Note 形态按 notes 规则。满足条件后写 `可关闭：是`，在卡顶补 `> **结论/去向**：<封闭值> — <落点>` 块、状态行补 `审查：`，并同次归档，不留活跃清单。

- 有结论：`git mv` 进 [settled_issues](../_archive/settled_issues/README.md)，frontmatter `status: 已结`，卡顶补 `结论/去向` 块、状态行补 `审查：agent｜用户｜跳过 — 理由`（状态行只做镜像）。
- 用户叫停且无结论：进 [suspended_issues](../_archive/suspended_issues/README.md)，`status: 叫停`；重启需用户明确新决定。

搬迁保留文件名和讨论正文，修相对链接，更新两边清单。frontmatter 不复制正文长说明：`status` 活跃用 `推敲中`、`待落地` 或 `等人拍板`，`opened` 为立卡日；离开时只改 `status`。🔒 卡只由用户判定触发，agent 不自行删卡或实施。
