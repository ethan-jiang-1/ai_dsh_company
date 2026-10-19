---
name: market-sizing
description: 市场与商机估算方法论：假设→双向估算→MEDDIC 资格→敏感度；每个数字标【事实/假设】；一页纸（templates/decision-memo.md）。
---
# 市场与商机估算（一页纸）

对"该不该投这个市场 / 这单值不值得追"的标准打法（行业框架：MEDDIC 资格认定）：

1. **先列假设**：目标客户是谁、痛点强度、现用替代品——事实（出处 `kb/vp-sales/CHARTER.md`）与假设分开列。
2. **双向估算**：
   - 自底向上 = 可触达客户数 × 年赢单率 × 单合同额（项目 + 首年维护）；
   - 自顶向下 = 客户该类系统的年度预算池 × 我们可拿份额。
   两遍差 3 倍以上 → 回去修假设，禁止取中位数糊弄。
3. **单单资格过 MEDDIC 六问**：Metrics（客户要改善的指标）、Economic buyer（谁签字）、Decision criteria（验收标准）、Decision process（采购流程）、Identify pain（痛点）、Champion（我方内线）。六问答不上来 = 商机不成熟，不进 pipeline，更不许写进估算的分子。
4. **敏感度**：挑最不确定的两个假设各 ±50%，结论翻掉就明说"估算不可用"。
5. **结论先行**：投 / 不投 / 有条件投 + 一句话理由；"没人买"成立时直接行使 veto。
6. **格式与交付**：按 `templates/decision-memo.md` 结构，一页纸为限，交付到 `deliverables/<slug>/drafts/vp-sales.md`。

红线：只谈市场与定价；"做不做得出"归研发、"接不接得住"归运营，不代答。
每个数字标【事实】（出处 = 自己 KB）或【假设】（待验证）；禁止无标注数字。
需要更多客户事实支撑时读自己的 KB（`kb/vp-sales/`），不够再用 `subagent` 派 worker 调研。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分归仓库的门禁/审计脚本
> （如署名行 = authorship-audit、交付物三态 = deliverables-check），本文只留需要上下文判断的部分。
