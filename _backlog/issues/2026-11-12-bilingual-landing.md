---
status: 待落地
opened: 2026-11-12
---

# 推动落地：内部全英文 + 表达层双语（I1 剩余 / I2 / I3 / E1）

> 立卡：2026-11-12 ｜ 状态：待落地 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否 ｜ 审查：用户 — 2026-11-12「继续往前」「只有 issue 才能真正推动 REPO 落地」；agent — 研究/ RFC / 已交付切片盘点
>
> **结论/去向**：implementation — [内部全英文 RFC](../../notes/proposed/2026-11-12-internal-english-canonical.md) + [表达层 RFC](../../notes/proposed/2026-11-12-bilingual-company.md)（方向已批；本卡驱动剩余实施，不替代 RFC 验收）

## 原始意图（用户原话）

> 「好的，没有问题。这个应该是个挺挺轻松的事儿，是吧？就是要细致一些。让我决定的事情，你帮我好好想想吧……兼容的问题不重要，我们只看今后怎么做对就行。」
>
> 「好的，挺好，那就那个这痕迹吧，显性化成issue，然后转向notes……要么就全英文。」
>
> 「再加点轮次，我给你再加点轮次，继续往前。」
>
> 「`_backlog/research/bilingual-company` 你这个研究是在这里头是吧……做完了之后……要提出一个issue出来啊，只有issue才能真正推动REPO这里的落地。」

## 问题与期望结果

**问题**：内部英文与表达层双语已经分片实施，但没有一张**活跃问题卡**把剩余落地串起来；研究/RFC/commit 能记录决定，不能替代 backlog 的推进面。剩余的 content、领域值、I2/I3 与表达层收口容易散落。

**期望结果**：

1. 按两份已批 RFC 继续落地：内部英文单份 canonical；表达层 zh/en，默认 zh；角色名按已定混排。
2. 每片留 keyless 回归（不要求端到端），先红后绿；不把 token 清零/单个 pilot 说成整体完成。
3. 收口时给出实证据：`pnpm test` / `typecheck` / `lint` / `dup` / `verify` / `preset-smoke`；真页面与真模型 prompt 未跑就如实标未执行。
4. 兼容不作为设计约束；旧盘/旧字段不做长期双读。

## 当前情况（摘要）

**已落地**：
- 表达层地基：locale 字典、默认 zh、host 语言桥、页签壳、品牌。
- 角色名：`role-copy` + `roles.*`；RoleBadge/Delegation/Presence/Tasks/Board/DAG/Cultivation/context picker/host 回执。
- 24/24 skill 正文英文；11/11 persona 英文；meta 全部机器字段英文；机器 token（ASSIGN/状态、pending-sources、claim/yield、quality-loop 处置、date-pending、`[NEEDS-CLARIFICATION]`、`[fact]/[assumption]`、`By/Version/Brief`）。
- content/templates：decision-memo / review-note / ops-review-note / weekly-report / strs / mrd 已英文（6/8）。

**P0 进展（2026-11-12，本轮）**：
- 待办页签 + PanelFrame 浮出/收回双语；`attentionLabel` 中文纯函数移除，改字典 key。
- `tests/client/i18n/attention-tab.spec.ts` zh/en 静态渲染；client 370 passed；`ui-scene-smoke --isolated --golden` 9 页签金样一致。
- 任务板页签/表格/头部入口双语；`tasks.*` 字典；header action 注册 locale；client 371 passed；金样仍一致。
- 看板/DAG 双语：列/空列/依赖就绪/等待/drift、DAG 状态徽章/空态/重画；client 373 passed；金样仍一致。
- 在场/用量双语：成员行状态/aria/空态/协作动态标题、轮次/步数/工具占比/四路 token 行；client 375 passed；金样仍一致。
- 已知残留：协作动态 `entry.text` 仍由 lib 生成中文，下一批改结构化 token。

**剩余**：
- `content/templates/meta.md`、`prd.md`（2 个）。
- `content/generic/`、`content/charters/`、`content/product-types/`、`content/delivery-modes/`、`content/state/`、`content/company/`。
- 领域值（台账表头/状态词等）。
- I2：`src/**` / `tests/**` 注释、日志、测试名英文 + 内部 CJK 门禁。
- I3：README/docs/AGENTS 等开发者文档英文。
- E1 剩余：面板/培养/成品/台账/待办/工具卡的 zh/en 全量、真页面 en、真模型 prompt。
- 未跑：`client-load-smoke` / `release-smoke` / 真页面 en / 真模型 prompt。

## 执行顺序（2026-11-12 校准，先做小闭环）

用户指出「这件事儿不会这么复杂」。复核后，复杂度主要来自把**存量中文内容/注释/docs 的迁移**塞进了同一个目标；产品功能本身（UI 表达层 + 默认中文 + 角色名）不大。因此按 P0/P1/P2 拆：

- **P0（本卡当前执行面，先交付）**：company UI 全部表达层 zh/en（面板/培养/成品/台账/待办/工具卡）、默认 zh、角色名混排、快速回归 + zh 金样；不把 content 翻译作为 P0 阻塞。
- **P1（内容英文单份）**：`content/**` / persona / skills 已大部分完成；剩余模板与 content 目录按批次，**另开内容卡**，不阻塞 UI。
- **P2（代码/文档卫生）**：I2 注释/日志/测试名、I3 开发者文档；**另开卫生卡**，不阻塞 P0/P1。

本卡的 `## 验收标准` 仍是总体完成定义；**当前只承诺 P0**，P1/P2 完成前不关闭本卡。

## 范围与排除项

**在范围内**：
- 两份 RFC 的 I1 剩余、I2、I3、E1 收口；每片 keyless 回归与红绿证据。
- content 英文单份（不建 `content/zh` + `content/en` 双份）。
- 领域值英文 canonical；旧盘不做长期双读。
- 表达层 zh/en 标签与真页面金样。

**明确排除**：
- 中英双份内部内容；每语言一套 preset；把表达层改成单语。
- 全量重写业务语义；翻译不改规则。
- 端到端测试资产（用户明确不要求）；真页面/真模型仅作收口证据。

## 验收标准

- [ ] I1 内容：`content/**` 模型可读正文无中文（allowlist 只剩明确的表达层/夹具）；8/8 模板英文；领域值英文 canonical。
- [ ] I1 结构：`presets/**/SKILL.md` 与 persona 棘轮 PENDING = 0；meta 字段与 token 保持英文。
- [ ] I2：`src/**`/`tests/**` 注释、日志、诊断、测试名英文（allowlist = zh 字典/中文夹具/zh 断言）；内部 CJK 门禁真实红→绿。
- [ ] I3：README/docs/AGENTS 按 RFC 边界英文；文档门禁同 diff。
- [ ] E1：表达层面板/页签/卡片/回执 zh/en；默认 zh；角色名/结果/状态标签不裸英文；真页面 zh 金样 + en 至少一次实跑。
- [ ] 全量证据：`pnpm test` / `typecheck` / `lint` / `dup` / `verify` / `preset-smoke`；未跑项如实标未执行。
- [ ] 红→绿：每片至少一个真实失败形态被观察到并按原话记录；不能只说“做了”。

## 抽象度

- 换公司要改吗？→ 不会；语言是表达层偏好，内容是英文 canonical，中文由 policy 表达。
- 换产品类型要改吗？→ 不会；content/角色/领域值与类型正交，翻译不改规则。
- 换做法要改吗？→ 会；新增内部内容/字段默认英文；新增表达层文案必须 zh+en；加语言 = 表达层字典 + 角色/术语表。
- 只有机制本身变吗？→ 内部英文是内容/数据合同变更；领域值迁移要单独验证，不混在文案里。
- 第二消费者：中文表达层用户 + 英文表达层用户；内部模型/代码/日志只消费英文一份。
- 搬家成本：content 翻译数万汉字；领域值迁移中高；I2 注释/日志按目录分批；表达层已有地基。

## 关闭条件

- 两份 RFC 的 I1/I2/I3/E1 验收有实证据；未跑项如实标未执行。
- 本卡 `## 验收标准` 全勾；`去向` 落点可从卡顶直达。
- 收口记录（Note / commit / RFC 状态）同 diff；归档时按 backlog 规则 `git mv` + 两索引。
