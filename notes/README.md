# notes/ —— 开发记忆与证据链（本目录的分类 owner）

> **每个目录装什么、状态怎么读、由谁维护，以本文件为准**——职责由一个具名文件拥有，不由惯例拥有。
> 精神借源 = 外部仓 ai_dsh_assitant/notes/README.md（维护者本机）（D35；对齐与偏离登记见 §四，
> 登记行 = [external-research](../docs/external-research.md)）；DSH 原生定义 =
> [vendor Agent Notes](../vendor/dsh/.agents/notes/README.md)；收尾动作清单 = [dev-loop §12](../docs/guides/dev-loop.md)；
> RFC 层合同与实施 TDD 红绿环 = [proposed/README](proposed/README.md)（条目开工必读）；上游推敲/缺陷卡 =
> [_backlog/issues/](../_backlog/issues/README.md)（未成熟问题的澄清与交接；卡片状态不授权实施；交接程序 = [_backlog/methods/issue-to-note.md](../_backlog/methods/issue-to-note.md)；规则见 [_backlog/](../_backlog/README.md)）。

## 一、状态轴：一眼怎么读

每个子目录的 README = 该层**宪章**（收什么/不收什么/谁来读），不记内容清单——清单 = 目录本身。

| 位置 | 装什么 | 状态行怎么读 | 读者怎么用 |
|---|---|---|---|
| [proposed/](proposed/README.md) | 未实施的**已批 RFC**（问题/方案/输掉的方案/验收） | 状态行自带「批准：」标记 + 「## 验收」节（门禁双查） | 看验收与方案；**不能当已交付**；实施次序 = 用户逐条给（D32） |
| [implemented/](implemented/README.md) | 已交付决定 + 击败的备选 + 后果与验证 | `状态：` 行以 implemented / 已交付 / 已消化 开头（门禁查新写） | **当前 rationale owner**——决定正文冻结，**事实落点（路径/符号/默认值）随改动就地改新**（§三 bare-path） |
| [rejected/](rejected/README.md) | 被推翻/过时的**研究稿**（负知识；被否决的方案住各 Note 的「输掉的方案」） | `rejected` | 只在还能阻止同一个可信错误时保留；失效即删 |
| [archived/](archived/README.md) | 顶层 = 仍能阻止重开的冻结判定（+ release.md 点名的现行 pin 人审证据）；`receipts/` = 只帮复核的历史证据（非否决） | 冻结 | 顶层与 implemented 同一条记录判据；receipts 不做现行权威；失效可删（按 §五） |
| [postmortem/](postmortem/README.md) | 事故复盘（编号 000N） | — | 事故 ≠ 设计推敲（[_backlog 章程](../_backlog/README.md)同款区分） |

**状态行**：新写或**再编辑**的 Note 首部有「状态：」行（存量不回扫；`notes-liveness` 门禁查 implemented/ 新写侧）。
**收据层**：`archived/receipts/` 只放演练/E2E/批次/状态快照等历史证据——不是决定、不是否决；
现行事实看 docs/代码/门禁，收据只用“当时”口径引用（规则 = [receipts/README](archived/receipts/README.md)）。
**命名** = `YYYY-MM-DD-<slug>.md`（全日期；时间轴 = 文件名日期 + git log，D34）。**互引**只用相对
Markdown 链接（md-links 门禁硬查）。**生命周期是移动不是复制**：`proposed → implemented` 同 diff 把正文
改写成现在时的已交付事实（删迁移计划与未来时态）。决定已落地、现行合同才是权威、但否决仍能阻止重开的，移到 `archived/`（冻结，不再当 rationale owner）。没有这条否决的旧文按 §五 处置（收据删除需点头），历史在 git。

**检索配方**（「开工按主题检索相关 Note」的一步操作，2026-10-21 立）：决策级先查
[decisions.md](../docs/decisions.md) 的 D 号路由表；机制级 `rg -l '<关键词>' notes/implemented/`
——同义词都试一轮（别名对照 = [terminology](../docs/terminology.md)，如「在场/驾驶舱/presence」）。
no-index 教义下没有主题索引：**目录树 + 全文检索就是清单**，检索不到 ≠ 不存在，换词再试。

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
- **上游回链**：由 `_backlog` 卡毕业的 Note，在状态行或开头带 `上游 = [卡](...)`；卡生 Note 的可追溯性靠这一行，不靠归档卡反查。
- **取代检查（每新增一篇 Note 触发）**：搜活跃树找同决定/同机制的既有 owner——完整取代：吸收其独有
  理由/备选/后果/验证后**同 diff 删除旧的**（历史归 git）；部分取代：双方保留互链并更新仍有效的事实。
  同一决定的事实变化更新原文；决定逆转另写新 Note 互链，不把旧文改写成相反。**互链是双向的**：
  implemented 旧文同 diff 加「被…取代」指针；archived 是冻结层，不回写——由新 Note 单侧承载指针
  （写侧细节 = §五）。
- **备选必载**：决定类 Note 必带「输掉的方案」——没记录击败了什么的决定会重新开讼；备选只记录、不编造。
- **范式**：收尾 Note 的写法样板 = [journal-presence-mechanism](./archived/2026-09-26-journal-presence-mechanism.md)（决定、输掉的方案、验证三件齐；2026-10-06 条目 D 自 AGENTS 纪律表迁来，指针随家）。
- **真证据（D35 吸收）**：毕业 Note 必须记录**真跑过的命令与红/绿形态**（含造红的红）；被阻断的检查
  如实写「阻断 + 原因」，不得写成绿；**未验项不得写 implemented**。改动面 → 最窄检查（行级映射）=
  [tests/README](../tests/README.md)，其**政策** = [testing.md §2](../docs/testing.md)；实施序列（红绿环）= [proposed/README](proposed/README.md)；
  宣布完成前对照授权原文 = [dev-loop §12](../docs/guides/dev-loop.md)。
- **内容策展**：Note 只记录对后续决策、实施或复验仍有用的信息；过期或重复且不再指导行动的内容删除；
  保留有效约束、否决理由和可复用验证证据。

## 三、机械门禁

- `proposal-scheduled` / `proposal-graduated`（proposed 侧：批准标记 + 「## 验收」节 + 该毕业的毕业）。
- `notes-liveness`（D35 立）：`implemented/` 文件名日期 ≥ 2026-10-05 的 Note，前 6 行必须有 `状态：` 行
  且以生命周期词（implemented/已交付/已消化）开头——存量按生效日祖父豁免；反证 =
  [notes-taxonomy-owner](./archived/2026-10-05-notes-taxonomy-owner.md)。
- `notes-supersession`（2026-10-30 立）：`implemented/` 旧文被说「取代/部分取代」却没出现新文件名即红；
  archived 目标豁免（冻结层不回写）。判据 = §五。
- `notes-archived-links`（2026-10-30 立）：`archived/**/*.md` 的 markdown `.md` 链接必须存在——
  `md-links` 不扫该层，移动/归档后的断链由本门补。
- `md-links`（implemented/proposed/postmortem 硬查；**archived 不扫**）/ `bare-path`（**proposed/ +
  implemented/ 新写为硬档**；`postmortem/` 与 `_backlog/_archive/` = 观察档；**archived 不扫**）。**事实落点时效**（2026-10-09 N5 修）：implemented/ 的
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
[rfc-tdd-loop](./archived/2026-10-05-rfc-tdd-loop.md)），本文件只管分类与证据门槛——两文件分工不重叠；
生命周期细则从 dev-loop §12 迁来。sdlc-01 里明确不吸纳的（class 子目录、seal manifest、中心索引、状态值域门禁）已过时或已由本文件 §四写明，吸收稿已删。
**偏离**：① `postmortem/` 独立保留（借源仓并入 implemented；本仓 _backlog 章程已立「事故复盘 ≠ 设计
推敲」区分，编号逐件以目录为准）；② 不借「文件名日期 == 状态行日期」门禁——本仓时间轴 = 文件名日期 +
git log（D34），状态行不重复载日期；③ 不借 `{lifecycle}/{class}/` 两级路径（生命周期轴已够用，class
正交——同借源仓偏离 DSH 的理由）；④ 不设计数清单（路径树即清单，D34 同款教义）；⑤ `proposed/` 语义：本地（D32）只收已批 RFC，借源仓是待点头取舍的停车场——**结论未确认**的“做”留 `_backlog/issues` 的 `等人拍板`；结论已确认但下游未受理的记 `去向=用户（日期）`，不进 `proposed/`；受理后由用户指令进入。

## 五、长期维护：分诊与审计（2026-10-30 立）

- **写侧防复发**：新 Note 说「取代/部分取代」时，同 diff 做三件事——① 给 implemented 旧 Note **文首**加
  「被…取代」指针（旧文已不是现行 owner 的，`git mv` 到 archived）；② 新 Note 的「输掉的方案」载明旧决定；
  ③ archived 不回写（冻结层），由新 Note 单侧承载指针。**没有回链的取代 = 未收口。**
- **机械面**：`pnpm notes:audit`（只读工作表）枚举死路径、取代缺回链、收据特征、零 Note 入链（docs 路由不计）、状态行异常；
  它只出候选，不判语义、不删任何东西。
- **语义面**：机制改口、大版本前、或机械面成片报红时，走
  [notes-consistency-audit](../.agents/skills/notes-consistency-audit/SKILL.md)；报告落
  `_backlog/_archive/research/notes-consistency/`（报告不是 Note）。
- **节奏**：发布前按 [release runbook](../docs/guides/release-runbook.md) §0 跑一次机械审计（<1s）；机制被重新决定的那一轮做语义分诊。
  不设日历、不建第二套决定清单（证据 digest 只做收据入口）——目录树 + 全文检索仍是清单（§一）。
- **删除授权**：收据/流水先 `git mv` 到 `archived/receipts/`（不删）；确实失效或重复时才合成 digest 后删原文
  （需用户明确点头，git 保留历史）。旧决定优先 `git mv` 到 archived 顶层；删除现行 rationale owner 需点头。
- **主动卫生（不等日历）**：① 写之前先问三句——这是**决定**还是**收据**？它**取代了谁**？**谁还会读**它？
  收据分流：叙事性 → `archived/receipts/`；机器产物 → `snapshots/` 或部署仓；调研材料 → `_backlog/research/`——都不进 `implemented/`；② 每次 `pnpm verify`
  已有 `notes-supersession` 硬门禁，取代缺回链直接红，不靠人记得；③ 发布前 runbook §0 跑
  `notes:audit --strict`，出现**新的**收据候选/死路径、或同一机制**第二次**改口，就在当轮做语义分诊；
  ④ 拒绝“以后可能有用”——过期证据先进 receipts，失效后按 §五 删（需点头）；archive 顶层只留 veto。
- **五分处置（按剩余价值，不按年龄）**：

  | 处置 | 判据 | 落点 |
  |---|---|---|
  | `archive` | 决定已落地/被取代、现行合同是权威、剩余否决仍能阻止重开 | `archived/`（冻结，不回写） |
  | `receipt` | 无决定（收据/流水/状态快照） | 叙事性收据 → `archived/receipts/` + digest 一行；机器证据优先 `snapshots/`/部署仓；失效后按 §五 删（需点头） |
  | `delete`（需点头） | 完整吸收且无剩余否决；或收据失效/重复 | git 历史；收据 digest 同步移除 |
  | `留 + banner` | 部分取代：仍有现行事实/否决 | 原地；文首指针 + 新 owner |
  | `就地修事实` | 决定仍现行，仅路径/符号/默认值过期 | 原地（D38） |

  只 archive 不能消除“现行文档与旧文相反”：现行 owner 必须同 diff 改；archive 只让它退出竞争。
  收据也不进 archive 顶层——`receipts/` 是证据层，防止“冻结否决”被流水稀释。
  例外：`release.md` 点名的现行 pin 人审证据按合同住 archive 顶层（不是否决，也不是收据）。
