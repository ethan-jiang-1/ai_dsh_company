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
- I1 pilot：`customer-voice` 英文单份；`tests/presets` 132 passed；`preset-smoke` ALL PASS
  （11 preset 可挂载）。
- 棘轮红→绿：给 pilot 追加中文 → 2 条红；还原 → 绿。
- 门禁红→绿：pilot 的 `applicable product types` 改成 `nope` → 红（点名文件 + 无类型包 +
  未覆盖默认类型）；还原 → 绿。中文契约块仍绿。
- 全量：`pnpm test` 207 files / 1630 tests passed；`typecheck` 0；`lint` 0；`dup` 0。
- 外部红（非本切片）：工作树另有两个并行研究材料正在写，`pnpm verify` 有
  md-newline / md-links / bare-path / pin-currency / tracked-portability 红；未触碰、未纳入 commit。

## 后果 / 未做

- 角色名主表面与 host 回执已混排；数据仍是 canonical 英文。
- I1 还剩 23 个 skill、persona/agent.cordis.yml、`content/**`、领域值/picker 内部英文。
- I2（注释/日志/测试名英文 + 内部 CJK 门禁）、I3（开发者文档）未开始。
- 本 Note 只记录已交付切片；完整目标仍由两份 RFC 承载。
