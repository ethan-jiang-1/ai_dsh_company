---
status: 推敲中
opened: 2026-10-19
---

# 推敲：成品台账——要不要把「公司产出」列成可核对的目录

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 毕业：未定 ｜ 可关闭：否

**问题与期望结果：** 从 [已结公司面 UX 优先级](../_archive/settled_issues/2026-10-19-company-panels-ux-priority.md) 拆出。台账面板现在读 `kb/motion-ledger.md` 的 40 行动议表，**不是** 993 份成品；「要不要一个成品台账、数据面取什么」是独立的产品选择，不是台账 UX 轮能顺手做的。本卡只推敲这个选择，不实施。

**当前情况：**
- 动议台账 ≠ 成品目录：面板数据面 = `kb/motion-ledger.md`（40 行），成品在 `company-workspace/deliverables*/`（约 993 个文件）。[BUG-025](../_archive/fixed_bugs/BUG-025-ledger-reads-wrong-data-face.md) 已订正这个口径。
- D20：成品 = Lead 的 `present`；台账「成品」列的 ✅ 是文本代理（[`ledger.ts`](../../packages/company-pack/src/lib/ledger.ts#L61) 的 `final.includes('✅')`），不是机器判据。
- DSH 已有 `present` / `ui-deliverables` / `deliverables-check` / workspace-changes；按 [release.md](../../docs/release.md) §vendor 政策与 D9，先证伪「这些不够用」再自建。
- 现有审计：`checks/audit/deliverables-check.mjs` 读真盘成品并判 `final-not-presented` 等；`tools/lib/deliverables.mjs` 是解析 owner。

**未决问题（需要人或后续推敲）：**
1. 要不要成品台账？这是产品选择，不是「面板好不好用」。
2. 若要：数据面 = `present` 事件（D20）还是盘上 `deliverables/` 目录？谁拥有「成品」口径？
3. 与现有台账面板的关系：替代、并列，还是只加一个入口？

**下一步：** 三张面板卡已全部收口，本卡可动。等你定：现在推敲（产品选择/数据面/与动议台账的关系）、标「以后做」（触发 = 真需要成品目录时）、或「不做」；未拍板前不设计实现验收，也不动现有台账面板。

## 范围与排除项

- **范围内**：成品台账的产品选择、数据面、与动议台账的关系。
- **范围外**：不动动议台账面板（归 [台账 UX 深挖](../_archive/settled_issues/2026-10-19-ledger-ux-deep-dive.md)）；不新增或重写交付物审计判据；不重写 `present`；不升 vendor。

## 关闭条件

按 [_backlog 章程](../README.md) 关闭条件：做/以后做/不做/已有结论；决定做的先按 [验收设计](../methods/validation-design.md) 写 `## 验收标准`；需要下游处理时按 [交接方法](../methods/issue-to-note.md) 提交并记录去向。
