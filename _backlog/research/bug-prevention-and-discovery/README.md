---
status: 已定性
opened: 2026-11-23
---

# 缺陷预防与非 E2E 发现手段：为什么 11 月 20 日试点后仍持续靠 E2E 找 Bug

> 问题：在 [content 合同族预防试点](../../_archive/settled_issues/2026-11-20-quality-prevention-contract-pilot.md) 与 [公司盘读取结果收口](../../_archive/settled_issues/2026-11-20-company-file-read-state.md) 落地后，11 月 20–23 日仍通过六轮端到端验收发现了 50 张缺陷卡（`BUG-283`–`BUG-332`，49 修 + 1 撤回）。根本上：（1）在代码实践与程序设计上还有哪些办法能更早预防 bug？（2）除了靠端到端，还有哪些更低成本、更系统的手段（含项目自研定制 linter / 契约工具）能主动发现代码里的 bug？
> 消费者：用户 2026-11-23 直接委托的先期研究；首卡 [客户端静态猎手、满态双语扫面与全 Slot 真挂载](../../_archive/settled_issues/2026-11-23-client-static-guards-and-contract-sweep.md) 与二期卡 [六大解析器畸形 Fuzz、Bounded 原语与 Live↔History 差分](../../_archive/settled_issues/2026-11-23-fuzz-bounded-differential-guards.md) 均已落地结项；剩余 T1-4 进程 RAII 与 Tier 2 按触发条件再议。
> 产出的卡：[首批卡](../../_archive/settled_issues/2026-11-23-client-static-guards-and-contract-sweep.md)（已结）、[二期卡](../../_archive/settled_issues/2026-11-23-fuzz-bounded-differential-guards.md)（已结）。
> 结论：11-20 试点加固的 content 面后续 0 缺陷，11-20～23 的 49 张已修卡 81.6% 落在 client/lib 且 87.8% 只需 keyless vitest 即可打红；根因是错误使用宽容兜底与缺少“单测↔E2E”之间的静态/生成式防线。实盘核验后建议拆成小卡顺序推进：首卡零新依赖落地（精选 oxlint 规则 + 基于 TS Compiler API 的自研领域静态审计含 must-use-boundary/双语/类型逃逸 + 现有 i18n 补满态与全角标点 + composition 补真 Slot inject 挂载），随后第二卡推进解析器畸形 Fuzz、Bounded 管线与 Live↔History 差分；品牌类型/变异/状态机按触发延后。

> **性质声明**：本题全部材料为**研究与立项前置材料，不是系统面落地或缺陷修复**；未修改任何产品代码、测试、配置或门禁。文内提及的现行源码扫描命中点仅为只读维护观察，进入首卡实施前需逐条确认。

## 一句话摘要

1. **为什么 11-20 试点没拦住 11-20～23 的 50 张卡？** 因为 11-20 试点加固的是 `content` 合同族（**后续 0 缺陷**）与 5 个 host 状态读入口；而 11-20～23 集中爆发在 **client/lib 读模型、解析器、有界读取、双语表达层与接线面**（40/49 = **81.6%**），且 **43/49（87.8%）最终只需纯 keyless `vitest` 即可红→绿复现**——真正必须靠真进程/真浏览器才能看见的仅 6 张（12.2%，且全是工具/车道/探针缺陷）。
2. **关于「防御式 / 保守式 / 按约定写程序」的核心反转**：本仓近期近三分之一的缺陷恰恰是**错误使用“宽容式兜底”**制造的。真正防 bug 的代码实践是：**信任边界处“全量解析、显式报错”（Parse, Don't Validate）+ 内部边界“进攻式/fail-closed 契约断言”（Design by Contract）+ 类型系统让非法/半截状态不可表达（ADT / 穷尽检查 / `Bounded<T>` 边界单子）**。
3. **除了通用 linter 与 E2E，自研定制工具最有价值的地方**：实盘干跑证实 `oxlint --react-plugin` 56ms 即可抓出 `DeliverablesTab.tsx:154` 漏 `t` 依赖的现行真 bug；而通用 linter 管不了的本仓高频病根，最适合用仓内已有的 **TypeScript Compiler API（零新依赖）** 自研轻量 **Must-Use-Field 边界/诊断防丢弃检查器**（专抓 `.eof`/`.skipped`/`.capped` 被忽略）与 **领域 AST 规则**，再配合现有 `tests/client/i18n/` 满态化与 `company-client-composition` 全 Slot 真 `inject` 挂载，把 ~85–90% 缺陷前移到秒级自动捕获。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-23-post-pilot-bug-anatomy.md](2026-11-23-post-pilot-bug-anatomy.md) | 实证解剖：`BUG-283`–`BUG-332` 五十张卡的分布、7 大根因族、修一漏三连锁与 2026-11-23 现行源码只读扫描证据 | 2026-11-23 |
| [2026-11-23-coding-practices-for-bug-prevention.md](2026-11-23-coding-practices-for-bug-prevention.md) | 回答问题一：七大代码实践与工程范式（Parse Don't Validate、ADT/品牌类型、边界防御 vs 内部进攻契约、有界管线、声明即消费、零类型逃逸、进程 RAII） | 2026-11-23 |
| [2026-11-23-beyond-e2e-bug-discovery-methods.md](2026-11-23-beyond-e2e-bug-discovery-methods.md) | 回答问题二：十大非 E2E 缺陷发现手段及 49 张已修卡回溯捕获矩阵 | 2026-11-23 |
| [2026-11-23-adoption-roadmap-and-stop-rules.md](2026-11-23-adoption-roadmap-and-stop-rules.md) | 落地优先级（Tier 0/1/2）、与本仓既有架构/宪法的衔接、成本收益评估及反过度工程停止条件 | 2026-11-23 |
| [2026-11-23-custom-linters-and-feasibility-audit.md](2026-11-23-custom-linters-and-feasibility-audit.md) | 实盘可行性核验（4 项修正：`oxlint` 23 条分诊、现有 i18n 空态陷阱、`happy-dom` 现状、10 处 `as never`）与 5 件本仓自研定制工具方案 | 2026-11-23 |

## 关联既有沉淀（不重复造轮子）

- 上一轮预防试点与生产源头研究：[quality-prevention 归档题](../../_archive/research/quality-prevention/README.md)、[source-prevention-design 归档题](../../_archive/research/source-prevention-design/README.md)
- 活跃 E2E 设计卡（分工衔接）：[2026-11-21-company-e2e-test-design.md](../../issues/2026-11-21-company-e2e-test-design.md)
- 上游 DSH 防御模式权威库：[vendor/dsh/docs/defensive-patterns/README.zh.md](../../../vendor/dsh/docs/defensive-patterns/README.zh.md)
- 本仓测试宪法与失败类决策表：[docs/testing.md](../../../docs/testing.md)、[tests/failure-classes.md](../../../tests/failure-classes.md)
- 本仓既有生成式差分范本：[tests/lib/docs/markdown-shape.property.spec.ts](../../../tests/lib/docs/markdown-shape.property.spec.ts)、[checks/lanes/generative.e2e.mjs](../../../checks/lanes/generative.e2e.mjs)
