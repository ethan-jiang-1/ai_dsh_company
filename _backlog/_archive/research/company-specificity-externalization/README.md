---
status: 已定性
opened: 2026-11-09
---

# 公司/领域特殊性外置：盘点与分离契约

> 问题：这个虚拟公司产品里，哪些内容是该行业（硬软一体 / 系统工程 / 项目制）特有的，哪些是该部署（名字、编制、部门数、政策线）特有的，哪些才是跨公司通用的能力？它们现在实际住在哪些载体里，换行业/换公司要动多少？
> 消费者：[把通用能力与公司/领域特殊性分离并显性化](../../settled_issues/2026-11-09-company-specificity-externalization.md)。
> 产出的卡：[把通用能力与公司/领域特殊性分离并显性化](../../settled_issues/2026-11-09-company-specificity-externalization.md)。
> 结论：方向已定（用户 2026-11-09）——三层：通用 / 领域 / 公司（领域层单位 = `productType`，不是行业；
> 2B 项目制、2B SaaS、2C、游戏、工具、服务各一份自包含包），按 T0–T3 渐进式披露（T0 常驻 ≤6KB、
> T1 摘要 ≤4KB、T2 按需、T3 技能），文件名即用场，单文件只回答一个问题。三类之外还有一条**版本轴**：
> 机制/引擎事实（`content/contracts/`）随 DSH pin，不随公司/产品类型。
> 特殊性不只在手册：整篇注入的手册、内联流程的 persona（0.8–1.9KB/人）、4 个模板里逐字复制的公司流程、
> 复述条线人数的 charters、写死政策数字的代码、client 的 15 类文案与三份显示名、tools 侧的独立名册。
> 系统工程五层链被当通用合同并由 `/req check` 机械强制（原型实证：默认要求 StRS，`VR-*` 无豁免判红）；
> MRD/PRD 是半通用问题锚点，StRS/SyRS/IRS/V&V 才是特殊。
> 覆盖：content 25/25、presets 30/30 逐文件；辅助面到 grep + 断言清单（见覆盖审计）。
> 分离不需要新机制：`systemPrompt.section` 多段、`skills.register`/`registerProvider`、
> `checkRequirements` 的 `options.layers` 都已够用，缺的是分层契约与门禁。

> 归档：2026-11-09
## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-09-specificity-inventory.md](2026-11-09-specificity-inventory.md) | 判据、载体地图、逐节判定、领域假设、重复陈述、错位、原型实跑、目标目录与 T0–T3 归位表 | 2026-11-09 |
| [2026-11-09-coverage-audit.md](2026-11-09-coverage-audit.md) | 二轮覆盖矩阵（content 25 / presets 30 / 辅助面）、上轮漏项 13 条、机制/版本轴、未覆盖边界 | 2026-11-09 |
| [2026-11-09-test-asset-map.md](2026-11-09-test-asset-map.md) | 文件系统改造的测试资产影响图：四种耦合、逐资产红点、测法迁移三原则、既有三处写反 | 2026-11-09 |
