---
status: 已定性
opened: 2026-11-20
---

# 质量预防：怎样让探索测试的发现积累为可收敛的保障

> 问题：长期依赖 exploratory test 找 bug、逐个补洞，为什么难以收敛？应在设计、测试资产和开发纪律的哪些位置预埋机制，使同类错误更早被消除或拦截，并为剩余探索设置明确边界？
> 消费者：用户 2026-11-20 点名并追加“结合本 REPO，研究清楚如何改善再思考落地”的授权研究；现由 [content 合同族预防试点卡](../../settled_issues/2026-11-20-quality-prevention-contract-pilot.md)承接。起点为 [Schemastery 质量专题](../../../../../deepseek-harness/_faq_on_digested/30_schemastery-basics/answer.md)与 [Preset 质量专题](../../../../../deepseek-harness/_faq_on_digested/31_preset-quality/answer.md)。
> 产出的卡：[2026-11-20-quality-prevention-contract-pilot.md](../../settled_issues/2026-11-20-quality-prevention-contract-pilot.md)（用户已批准并完成首批content实现；验证与决定见[实施Note](../../../../notes/implemented/2026-11-20-quality-prevention-contract-pilot.md)）。
> 结论：本仓已具备制度和执行链，content试点已把跨轮样本升级成动态资产并接回原入口；追加源码研究发现规则解码集中、计划联合类型及降级证据拥有者可减少具体作者义务，需按真实成本与需求选择，不能推断总体缺陷率下降；不再默认以产卡配额衡量探索完成。研究阶段是定性与实施交接；后续content首批落地见实施Note；用户继续后承接的[bootstrap生产类型试点](../../../../notes/implemented/2026-11-20-bootstrap-plan-payload-contract.md)单列证据，历史研究不充当实施证据。
> 归档：2026-11-20（试点卡已按用户授权交付、追加研究已定性；整题随末张活卡迁入研究归档，材料冻结不回填）

## 研究范围与出口

- 将 FAQ 的建议追溯到本仓钉住的 DSH 源码和本仓实际判据，区分声明、资产、接线、执行与效果证据。
- 解释已有纪律仍不能阻止无休止补洞的原因，区分已证实缺口、风险假设与尚缺运行数据的结论。
- 给出设计约束、独立判据、正反场景、真实装配、回放与模型评估的职责划分，以及复用现有载体的最小试点。
- 写清完成标准、探索预算、何时停止或重新打开；研究阶段交付是立项与研究材料，content试点的后续实际交付归实施Note。
- 用户追加：试点提交后研究生产源头是否有办法降低未来防范成本；从真实生产类型、读取器与状态拥有者取证，不把研究等同产品修改授权。

## 当前判断与未定项

用户重申生产源头问题后，[深化研究](2026-11-20-production-source-design.md)不以bootstrap局部试点代替完整答案：集合派生、可用性判断与降级传播已部分进入生产；当前值得评估的新增义务删除是规则领域解码集中。未来改动先明确输入/拥有者/失败状态，实施选择以实际删除的重复解释与兼容成本裁决，不以测试数或新框架作答。

首轮证据支持：先减少重复事实和旁路，把正确性放在状态拥有者的必经操作；再以独立正反例、跨消费者性质、真实装配、合成回放与任务成果验收分层保护。已有治理机制应复用，不再把测试数量和门禁数量当作收敛。

深化后已明确首切片、实际 owner、分期改动和验收。用户已确认研究后最终通过[首批卡](../../settled_issues/2026-11-20-quality-prevention-contract-pilot.md)承接落地；当前范围、取舍、必要步骤、交接去向和验收以该卡为准；下游成立前的变化同步回卡，成立后在此保留承接链接；[本仓实施研究](2026-11-20-repository-implementation.md)保存论据。首轮材料中“先查发布缺证据”的排序已由深化结果调整为 content 族；历史材料保留原证据。研究阶段未验证长期缺陷率；用户随后已批准首批并由实施Note承接，研究材料保留各自时点证据，不回填为实施证据。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-20-production-source-design.md](2026-11-20-production-source-design.md) | 生产源头深化：历史链对应的现有保护、规则解释唯一家、兼容语义、共享位置成本及有界反证 | 2026-11-20 |
| [2026-11-20-production-source-prevention.md](2026-11-20-production-source-prevention.md) | 追加研究：规则可信值、bootstrap计划联合与降级拥有者；源码可取消的维护义务、局部试点与收益边界 | 2026-11-20 |
| [2026-11-20-repository-implementation.md](2026-11-20-repository-implementation.md) | 深化主结论：本仓机制、两消费者12世界/3分支负控、具体实施与长期执行位置 | 2026-11-20 |
| [2026-11-20-recurrence-chains.md](2026-11-20-recurrence-chains.md) | C13–C17四条跨轮链，历史承诺/判据/新轴及现有修复边界 | 2026-11-20 |
| [2026-11-20-prevention-and-convergence.md](2026-11-20-prevention-and-convergence.md) | 本仓现状与两项隔离实验、预防插入点、最小试点及收敛条件 | 2026-11-20 |
| [2026-11-20-native-prevention.md](2026-11-20-native-prevention.md) | 对照钉版本的原生事故、真实加载、输入快照、独立结果与生命周期性质 | 2026-11-20 |
