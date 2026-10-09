# methods/ · 按当前问题选择方法

这里的方法辅助 [backlog 流程](../README.md)：澄清需求、补事实、比较方案、准备验收标准、交接结论。先按下表选一篇，再读该篇步骤；每张卡不必跑完整套。方法表列出的外部技能保留为固定基线，只有执行到依赖该技能的步骤时才读完整本体及其点名资源；摘要不能替代完整来源。

Backlog 负责问题、依据、结论和交接材料；向 [notes 流程](../../notes/README.md) 申请后，下游决定是否形成 Note 及如何处理。提交申请不等于 Note 已生成，也不等于下游完成。

## 现在需要哪篇

| 当前情况 | 方法 | 结果写在哪里 |
|---|---|---|
| 需求不清楚、术语有歧义，或问题太大需要分支讨论 | [澄清需求](requirements-elicitation.md) | 原卡的目标、边界、已确认回答和待确认问题 |
| 缺事实，需要调研、询问或试原型；收到的报告未经核实 | [补充证据](requirements-probes.md) | 短结论回原卡；长依据进 [research](../research/README.md) 并链接 |
| 需求清楚，但不知道怎样算完成 | [设计验收标准](validation-design.md) | 原卡的验收标准；需要区分行为时用矩阵 |
| 信息已齐，需要整理需求、比较方案或形成结论 | [整理方案与结论](requirements-synthesis.md) | 原卡的方案、取舍、结论和关闭条件 |
| 结论确定，需要申请下游处理或指向已有决定 | [申请下游处理](issue-to-note.md) | 原卡的结论与申请去向；是否形成 Note 由下游决定 |

通常先澄清需求、补齐事实，再整理方案。决定做的事项，在确定方案前补齐验收标准。决定延后、不做或已有结论足以回答的，不设计尚未要做的实现验收。

需要人的判断时，写明已知事实、选择影响、建议及具体问题，等待答复后再继续依赖该答复的部分。事实查证由 agent 完成；业务选择、品味和授权不能靠猜测补齐。

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
| [判断验收结果](validation-judgment.md) | 需要相应步骤时读 `skills/engineering/code-review/SKILL.md`、`skills/engineering/diagnosing-bugs/SKILL.md`、`skills/engineering/retro/SKILL.md` |
| [申请下游处理](issue-to-note.md) | 无外部技能依赖；遵循 [notes 入口](../../notes/README.md) |

来源更新时，重新核对实际使用的技能本体和点名资源，再调整本仓方法。技能自带 tracker、模板和发布默认值不替代本仓问题卡位置或用户授权。

方法形状借自 `/Users/bowhead/ai_dsh_assitant/_backlog/methods/`，来源工作树日期：2026-10-09；本地适配按本仓词汇、卡片和流程规则执行。
