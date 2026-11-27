# methods/ · `_backlog/` 专属内部作业手册

**本目录是 `_backlog/` 专属内部作业手册**——仅在进入 `_backlog/` 推敲问题卡或处理缺陷卡时按需使用，不被 `docs/` 反向依赖。这里的方法辅助 [backlog 流程](../README.md)：澄清需求、补事实、比较方案、准备验收标准、交接结论，以及把缺陷修到可归档。先按下表选一篇，再读该篇步骤；每张卡不必跑完整套。方法表列出的外部技能保留为固定基线，只有执行到依赖该技能的步骤时才读完整本体及其点名资源；摘要不能替代完整来源。

Backlog 负责问题、依据、结论和交接材料；申请默认向用户提出，批准后落 [notes/proposed](../../notes/proposed/README.md) 的 RFC 或 [notes/implemented](../../notes/implemented/) 的 Note。提交申请不等于 Note 已生成，也不等于下游完成。

## 两条轨，两套方法

| 轨 | 起点 | 方法序列 | 出口物 |
|---|---|---|---|
| 问题轨 | 问题、需求或取舍不清楚 | [澄清需求](requirements-elicitation.md) → [补充证据](requirements-probes.md) → [设计验收标准](validation-design.md) → [整理方案与结论](requirements-synthesis.md) → [申请下游处理](issue-to-note.md) | 结论 + 去向（封闭集六值：rfc / note / implementation / pending / none / rejected）；Note 常常是决定的知识载体 |
| 缺陷轨 | 一个可观察的行为偏差 | [诊断与修复缺陷](bug-fix.md) | `已修` 卡 + 红→绿证据 + 可对账提交；材料性或成批共享机制决定时附一篇 Note |

两轨共用五道门，但出口物不同：问题轨的完成物是决定，缺陷轨的完成物是系统面改动 + 证据。**不要把缺陷修成一篇 Note，也不要用改代码代替问题结论。**

## 问题轨：现在需要哪篇

| 当前情况 | 方法 | 结果写在哪里 |
|---|---|---|
| 需求不清楚、术语有歧义，或问题太大需要分支讨论 | [澄清需求](requirements-elicitation.md) | 原卡的目标、边界、已确认回答和待确认问题 |
| 缺事实，需要调研、询问或试原型；收到的报告未经核实 | [补充证据](requirements-probes.md) | 短结论回原卡；长依据进 [research](../research/README.md) 并链接 |
| 需求清楚，但不知道怎样算完成 | [设计验收标准](validation-design.md) | 原卡的验收标准；需要区分行为时用矩阵 |
| 信息已齐，需要整理需求、比较方案或形成结论 | [整理方案与结论](requirements-synthesis.md) | 原卡的方案、取舍、结论和关闭条件 |
| 结论确定，需要申请下游处理或指向已有决定 | [申请下游处理](issue-to-note.md) | 原卡的结论与去向（RFC / Note / 用户日期）；Note 形态按 notes 判据 |

通常先澄清需求、补齐事实，再整理方案。决定做的事项，在确定方案前补齐验收标准。决定延后、不做或已有结论足以回答的，不设计尚未要做的实现验收。

需要人的判断时，写明已知事实、选择影响、建议及具体问题，等待答复后再继续依赖该答复的部分。事实查证由 agent 完成；业务选择、品味和授权不能靠猜测补齐。

## 缺陷轨：从症状到已修

| 当前情况 | 方法 | 结果写在哪里 |
|---|---|---|
| 手上有一个或一批缺陷：先分诊 / 判 DSH 面，再复现、归因、按根因聚类、修、拿红→绿 | [诊断与修复缺陷](bug-fix.md) | 缺陷卡（症状 / 运行面 / 复现 / 根因与证据 / 失败类与同类排查 / 修复方案与范围 / 已修判定 / 修复证据）；多卡批次计划进 [bugs README](../bugs/README.md)「修复交接」（卡仍是每 bug 合同，批次表只是本轮计划）；无卡快修的 commit 与轮次回执 |

缺陷方法另参考会话 catalog 的 `diagnosing-bugs`（DSH 技能，不在下方固定基线内）：会话可见则用它的 feedback-loop 纪律，不可见则按 [诊断与修复缺陷](bug-fix.md) 自走。判据仍以本仓证据与授权规则为准。

## 后续需要验证时

以下为按需使用的辅助方法，不另立实施流程或验收队列；实施和 Note 维护遵循各自下游规则。

| 当前情况 | 方法 | 用途 |
|---|---|---|
| 已有验收标准，需要选择证据 | [选择证据](validation-evidence.md) | 按 [测试宪法](../../docs/testing.md) 找已有命令或资产，并说明证明边界 |
| 声称做完，需要判断是否符合要求 | [判断验收结果](validation-judgment.md) | 逐项记录通过、不通过、证据不足或等待人的判断；回写承载该工作的现有记录 |

发现需求不清时，回到该问题补充确认；发现实现不符合标准时，记录实际差异，不修改标准迁就实现。

## 方法维护

这些是本仓的工作方法，不是 preset 或自动发现的技能。正文采用英文，保留 `name` / `description` / `whenToUse` frontmatter，写明输入、步骤、结果位置和完成条件。

方法依据应来自实际使用或已完整阅读的外部技能；未试用的适配须如实说明。文档检查和 `pnpm verify` 的形状检查不证明方法有效。问题与结论留在卡片，方法文件不维护进度或待办。

## 外部技能来源与读取

表内技能原作者为 Matt Pocock；适配依据固定为 [ethan-jiang-1/skills](https://github.com/ethan-jiang-1/skills/tree/fad900074ddc0ce2f5e612e52ec75fda8a8f36d3)，基线 `fad900074ddc0ce2f5e612e52ec75fda8a8f36d3`，路径相对此仓库根目录。原作者仓库为 [mattpocock/skills](https://github.com/mattpocock/skills)，本地基线不随其当前版本自动变化。

执行时先查当前技能目录：可调用则按 harness 规则调用；未注册但完整本体及所需资源可读，则明确说明是读源执行后再继续。现有技能安装目录或本地 checkout 均可作为来源；缺本地副本时可读上面的固定版本。两条读取路径都不可用，报告缺少的本体和被阻断步骤，继续独立工作。安装或修改全局发现配置不属于本方法。摘要和 FAQ 只用于定位，不作为执行说明。

| 方法 | 需要时读取的技能本体（相对固定版本根目录） |
|---|---|
| [澄清需求](requirements-elicitation.md) | `skills/engineering/grill-with-docs/SKILL.md`、`skills/productivity/grilling/SKILL.md`、`skills/engineering/domain-modeling/SKILL.md`、`skills/engineering/wayfinder/SKILL.md` |
| [补充证据](requirements-probes.md) | `skills/engineering/research/SKILL.md`、`skills/productivity/to-questionnaire/SKILL.md`、`skills/engineering/prototype/SKILL.md`、`skills/engineering/triage/SKILL.md`，含其点名资源 |
| [整理方案与结论](requirements-synthesis.md) | `skills/engineering/to-spec/SKILL.md`、`skills/engineering/to-tickets/SKILL.md`；需分析模块接口时读 `skills/engineering/codebase-design/SKILL.md` |
| [设计验收标准](validation-design.md) | `skills/engineering/tdd/SKILL.md`、`skills/engineering/codebase-design/SKILL.md` |
| [选择证据](validation-evidence.md) | 无外部技能依赖；依据本仓 [测试宪法](../../docs/testing.md) |
| [诊断与修复缺陷](bug-fix.md) | 无固定基线；会话可见时用 `diagnosing-bugs` 的 feedback-loop 纪律，本仓证据/授权规则仍是判据 |
| [判断验收结果](validation-judgment.md) | 需要相应步骤时读 `skills/engineering/code-review/SKILL.md`、`skills/engineering/diagnosing-bugs/SKILL.md`、`skills/engineering/retro/SKILL.md` |
| [申请下游处理](issue-to-note.md) | 无外部技能依赖；遵循 [notes 入口](../../notes/README.md) |

来源更新时，重新核对实际使用的技能本体和点名资源，再调整本仓方法。技能自带 tracker、模板和发布默认值不替代本仓问题卡位置或用户授权。

方法形状借自外部仓 ai_dsh_assitant 的 `_backlog/methods/`（维护者本机），来源工作树日期：2026-10-09；本地适配按本仓词汇、卡片和流程规则执行。
