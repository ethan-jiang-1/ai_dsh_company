# notes/ —— 开发记忆与证据链（本目录的分类 owner）

> **每个目录装什么、状态怎么读、由谁维护，以本文件为准**——职责由一个具名文件拥有，不由惯例拥有。
> 精神借源 = 外部仓 `/Users/bowhead/ai_dsh_assitant/notes/README.md`（D35；对齐与偏离登记见 §四，
> 登记行 = [index §外部研究材料登记](../docs/index.md)）；DSH 原生定义 =
> [vendor Agent Notes](../vendor/dsh/.agents/notes/README.md)；收尾动作清单 = [dev-loop §12](../docs/guides/dev-loop.md)；
> RFC 层合同与实施 TDD 红绿环 = [proposed/README](proposed/README.md)（条目开工必读）；上游推敲/缺陷卡 =
> [_backlog/issues/](../_backlog/issues/README.md)（未成熟问题的澄清与交接，卡片状态不授权实施；规则见 [_backlog/](../_backlog/README.md)）。

## 一、状态轴：一眼怎么读

| 位置 | 装什么 | 状态行怎么读 | 读者怎么用 |
|---|---|---|---|
| [proposed/](proposed/README.md) | 未实施的**已批 RFC**（问题/方案/输掉的方案/验收） | 状态行自带「批准：」标记 + 「## 验收」节（门禁双查） | 看验收与方案；**不能当已交付**；实施次序 = 用户逐条给（D32） |
| [implemented/](implemented/) | 已交付决定 + 击败的备选 + 后果与验证 | `状态：` 行以 implemented / 已交付 / 已消化 开头（门禁查新写） | **当前 rationale owner**——决定正文冻结，**事实落点（路径/符号/默认值）随改动就地改新**（§三 bare-path） |
| [rejected/](rejected/README.md) | 被否决提案 + 一行拒绝原因 | `rejected` | 只在还能阻止同一个可信错误时保留；失效即删 |
| [archived/](archived/README.md) | 仍能阻止重开的冻结判定，加现行 pin 人审证据 | 冻结 | 与 implemented 同一条记录判据；失效即删，不是当前权威 |
| [postmortem/](postmortem/README.md) | 事故复盘（编号 000N） | — | 事故 ≠ 设计推敲（[_backlog 章程](../_backlog/README.md)同款区分） |

**状态行**：新写或**再编辑**的 Note 首部有「状态：」行（存量不回扫；`notes-liveness` 门禁查 implemented/ 新写侧）。
**命名** = `YYYY-MM-DD-<slug>.md`（全日期；时间轴 = 文件名日期 + git log，D34）。**互引**只用相对
Markdown 链接（md-links 门禁硬查）。**生命周期是移动不是复制**：`proposed → implemented` 同 diff 把正文
改写成现在时的已交付事实（删迁移计划与未来时态）。低价值稿不冻进 `archived/`：那边与 `implemented/` 同一条记录判据，失效即删，历史在 git。

## 二、何时写、取代与真证据（规则唯一家在本文件）

- **义务范围**：Note 只收**承载持久决定理由**的改动——代码、测试与现行文档说不清的 why 与放弃的备选；
  机械单步修正豁免（更新事实 owner、跑相关检查即可，不新建 Note）。决定随当前变更已交付的，直接写
  `implemented/`，不必从 `proposed/` 开始。
- **记录判据（不是 diff 大小）**：需要 Note 的信号 = **存在真实替代方案 + 持久取舍**；豁免的实质 =
  除决定理由无处安放外，其余事实都已有 owner（代码、测试、现有文档能承载的不重复记）。非平凡变更同 diff
  新增或更新相关 Note；pack 行为面变更同 diff 更新 [company-pack README](../packages/company-pack/README.md)
  已知限制段。**不是 Note**（2026-10-09 存量清扫立的负例，历史在 git）：轮次/会话收尾日记、探针或
  E2E 首跑收据、批次「已毕业」流水、被合同或后一篇决定完整吸收的研究长文、已退役流程的操作记录。
  这些不再指导行动，写进来只会让 rationale owner 被噪声淹没。
- **取代检查（每新增一篇 Note 触发）**：搜活跃树找同决定/同机制的既有 owner——完整取代：吸收其独有
  理由/备选/后果/验证后**同 diff 删除旧的**（历史归 git）；部分取代：双方保留互链并更新仍有效的事实。
  同一决定的事实变化更新原文；决定逆转另写新 Note 互链，不把旧文改写成相反。
- **备选必载**：决定类 Note 必带「输掉的方案」——没记录击败了什么的决定会重新开讼；备选只记录、不编造。
- **范式**：收尾 Note 的写法样板 = [journal-presence-mechanism](implemented/2026-09-26-journal-presence-mechanism.md)（决定、输掉的方案、验证三件齐；2026-10-06 条目 D 自 AGENTS 纪律表迁来，指针随家）。
- **真证据（D35 吸收）**：毕业 Note 必须记录**真跑过的命令与红/绿形态**（含造红的红）；被阻断的检查
  如实写「阻断 + 原因」，不得写成绿；**未验项不得写 implemented**。改动面 → 最小证据选择 =
  [testing.md §2](../docs/testing.md)；实施序列（红绿环）= [proposed/README](proposed/README.md)；
  宣布完成前对照授权原文 = [dev-loop §12](../docs/guides/dev-loop.md)。
- **内容策展**：Note 只记录对后续决策、实施或复验仍有用的信息；过期或重复且不再指导行动的内容删除；
  保留有效约束、否决理由和可复用验证证据。

## 三、机械门禁

- `proposal-scheduled` / `proposal-graduated`（proposed 侧：批准标记 + 「## 验收」节 + 该毕业的毕业）。
- `notes-liveness`（D35 立）：`implemented/` 文件名日期 ≥ 2026-10-05 的 Note，前 6 行必须有 `状态：` 行
  且以生命周期词（implemented/已交付/已消化）开头——存量按生效日祖父豁免；反证 =
  [implemented/notes-taxonomy-owner](implemented/2026-10-05-notes-taxonomy-owner.md)。
- `md-links`（notes 全树硬查）/ `bare-path`（**proposed/ + implemented/ 新写为硬档**；`postmortem/`、
  `archived/`、`_backlog/_archive/` = 观察档）。**事实落点时效**（2026-10-09 N5 修）：implemented/ 的
  **决定正文不动**，但**路径/符号/默认值这类事实落点随改动就地改新**——依据 = vendor
  `.agents/notes/implemented/AGENTS.md`「keep paths … current in the same change that alters them；
  This is not a license to rewrite the *decision*」。分生效日：文件名日期 ≥ 2026-10-09 的进硬档，
  存量祖父豁免（清存量是独立一轮，见 [currency Note](implemented/2026-10-09-implemented-note-currency.md)）。
  负例里的**假路径**带 `zz-`/`zzz-` 记号（门禁放行，保证负例逐字可复现）。
- **升级触发（不预铺）**：implemented 无真证据落档复发 → 「真证据」升机械门禁（负例夹具同 diff）；
  状态词表新增 → 词表与门禁同 diff 更新。

## 四、与借源仓的对齐与偏离登记（D35）

**借**：分类 owner 具名文件与状态轴速读表；「验收可执行」（哪条命令/断言什么/红长什么样——实施者
不看对话就能复现，落 [proposed/README](proposed/README.md)）；「implemented 只收真证据」表述；
取代检查/备选必载收进 owner 文件。
**适配**：TDD 红绿环住 proposed/README（RFC 执行合同，2026-10-05 同日先立，见
[rfc-tdd-loop](implemented/2026-10-05-rfc-tdd-loop.md)），本文件只管分类与证据门槛——两文件分工不重叠；
生命周期细则从 dev-loop §12 迁来（原吸纳记录 =
[2026-09-24 notes-lifecycle-absorption](implemented/2026-09-24-notes-lifecycle-absorption.md)，取舍仍有效）。
**偏离**：① `postmortem/` 独立保留（借源仓并入 implemented；本仓 _backlog 章程已立「事故复盘 ≠ 设计
推敲」区分，0001–0004 在档）；② 不借「文件名日期 == 状态行日期」门禁——本仓时间轴 = 文件名日期 +
git log（D34），状态行不重复载日期；③ 不借 `{lifecycle}/{class}/` 两级路径（生命周期轴已够用，class
正交——同借源仓偏离 DSH 的理由）；④ 不设计数清单（路径树即清单，D34 同款教义）。
