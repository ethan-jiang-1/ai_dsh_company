# Note 生命周期吸纳：DSH Agent Note lifecycle 六条细则（点选，不推翻）

状态：implemented（2026-09-24 晚；细则 owner = guides/dev-loop §12「Note 生命周期细则」）

## 问题

外部研究树参考 `_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`（基于上游
dsh-v0.1.7-rc.1 树整理的 DSH Agent Note 生命周期）系统摆出一套成熟 Note 纪律；用户令「一并借鉴
进来，点选吸纳，不推翻现有」。本仓 notes/ 体系（intents 台账 → proposed/ → implemented/ +
rejected/ postmortem/ research/）本就是 DSH 机制的裁剪版——需要逐点判断哪些补进来、哪些显式不要。

## 吸纳的六条（落 guides/dev-loop §12）

| 细则 | 吸自 | 对本仓的价值 |
|---|---|---|
| 状态行惯例 | 状态与目录互证 | 固化既有 19/42 惯例；未来门禁的地基 |
| 备选必载 | Alternatives considered — mandatory | 防重新开讼——与本仓「防复犯」同根 |
| 毕业 = 正文改写 | proposed→implemented 重写规则 | 防"未来计划伪装成当前事实" |
| 新增触发取代检查 | supersession check（同 PR 收敛） | 42 篇 implemented 树的健康保障——被取代决定不积压 |
| rejected 去留判据 | keep-only-while-it-prevents | 给 rejected/ 一个删除条件，防 hoard（与 D26 同向） |
| implemented 只跟事实 | facts-only updates | 与本仓既有规则重合，吸收其精确表述（路径/名称/结构，非决定本身） |

## 检查过、显式不吸纳的（防复犯：别再提一遍）

- **class 子目录体系**（feature/bug-fix/simplification/architecture/process/testing）：重构 42 篇
  implemented + 全仓链接属推翻级；规模翻倍或合并整治轮时与归档评估同窗再议。
- **archived/ 冻结树 + seal manifest**：2026-09-24 磨审计已评估「暂不归档」（r0-loop-acceptance
  仍被 guides/dev-loop §7 引为活判据），不重开。
- **去中心化 INDEX**（no-index rationale）：DSH 前提是"目录树即清单、按 class 浏览"；本仓开工方式是
  "按主题检索 intents 台账 + 队列指针"（D24）——intents.md 是入口不是冗余，保留；防漂移靠门禁 + D26。
- **严格状态值域 + 位置互证门禁**（verify-agent-note-format 同款）：现状 23/42 无状态行、值形自由
  （已消化 / 已落地 / ✅ 已交付…），门禁会大面积红；先固化惯例（新写/再编辑必带、存量不回扫），
  树收敛后再议门禁——届时按本仓纪律带反证。

## 取代检查（按新细则执行的首例）

搜同决定 owner：D26（文档卫生）、2026-09-23 research 层生命周期立规、guides/dev-loop §12 既有规则——
本 Note 是**细化不是取代**（部分重叠、互不吸收），互链保留。

## 验证

`pnpm verify` 全绿（md-links 含新增链接；doc-budget guides/dev-loop 403→418、index 137→138）。
本 Note 本身即「决定随变更交付、直接进 implemented/ 不必经 proposed/」的首次示范（用户令 = 决定
已做出；vendor README "a decision already made starts in implemented/" 同构）。

## 附注（进基座轮重校范围）

外部参考基于 0.1.7-rc.1 树，其引言提及上游 0008 复盘把 Note 创建标准收窄为「持久决定理由」并
显式豁免机械/局部编辑——我们钉的 rc.2 README 已含同向豁免句（"Only a purely mechanical or
local edit… is exempt"）；两树差异在升 pin 复活执行时对照（
[pin-upgrade-and-harvest §方案 3](../research/2026-09-24-pin-upgrade-and-harvest.md)，方案已随主线改向搁置进研究层）。
