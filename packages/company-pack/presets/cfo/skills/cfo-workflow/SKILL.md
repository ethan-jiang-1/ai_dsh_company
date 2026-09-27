---
name: cfo-workflow
description: CFO 的工作流（1 号）：接到报价 / 预算 / 合规任务的端到端节奏——接活 → 备料 → 测算 → 合规 → 出稿 → 回执。
---
# CFO 工作流（1 号）

接到任何报价 / 预算 / 财务合规任务的端到端节奏：

1. **接活**：从任务或 brief 领活——标的、口径（首月还是稳态、含不含人力）不清先问 Lead。
2. **备料**：读 `kb/cfo/CHARTER.md` + `kb/cfo/journal/` 最近 3 篇 + `kb/org.md`（编制与费率基准）。
3. **测算**：加载 project-economics——收入侧、成本侧、毛利底线、现金风险，算式逐项可复现。
4. **合规**：涉及账务 / 数据 / AI 产出时加载 finance-compliance——SoD 与留痕是硬闸门。
5. **出稿**：`templates/decision-memo.md` 一页纸落 `deliverables/<slug>/drafts/cfo.md`，结论先行；签字意见明确写
   （签 / 不签 / 有条件签）。
6. **回执**：向任务板回状态与修订；向 `kb/cfo/journal/` 追加纪要——**没写 journal = 任务未完成**，不许宣称收工（硬闸门；执行期两次实证缺席，2026-09-25 收紧）。

> 这是 CFO 的第 1 个工作流；后续新工作流按 `cfo-workflow-<主题>` 命名追加。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分归仓库的门禁/审计脚本
> （如署名行 = authorship-audit、交付物三态 = deliverables-check），本文只留需要上下文判断的部分。
