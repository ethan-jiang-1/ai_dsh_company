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

## 暂缓 / 阻断

- `fact-finding-playbook`、`ceo/assembling-the-team`、`ceo/chairing-staff-meeting`、`_shared/product-definition` 含机器可读中文 token：`待补料·<slug>·<T号>`、`派活｜…｜状态：待办`、`产品类型/交付模式`、`【待澄清】`、`日期待核`、`【事实】/【假设】`。必须先做 I1b token 英文化 + 消费方改造，不能和普通文案一起盲翻。

## 后果 / 未做

- 角色名主表面与 host 回执已混排；数据仍是 canonical 英文。
- I1 还剩 5 个 skill（`quality-loop` + 4 个机器 token 阻断文件）、persona/agent.cordis.yml、`content/**`、领域值/picker 内部英文。
- I2（注释/日志/测试名英文 + 内部 CJK 门禁）、I3（开发者文档）未开始。
- 本 Note 只记录已交付切片；完整目标仍由两份 RFC 承载。
