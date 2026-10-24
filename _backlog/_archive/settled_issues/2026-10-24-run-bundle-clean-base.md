---
status: 已结
opened: 2026-10-24
---

# 推敲：run bundle 作为安装单元——干净底座与角色能力分层

> 立卡：2026-10-24 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是

## 原始意图（用户原话，按时间顺序）

> 这一节是本卡的**目的源头**，不是转述结论。第二个 review agent 请先逐句对照：下面的问题陈述、
> 范围与方案，是否忠实于这些原话；任何偏离都要在 review 里点名。

1. **“要装给不同的 CEO”**：
   > 「需要你做一个研究, 这里很多历史的数据, 就是这个CEO的历史什么的都是数据/artifacts,
   > 要安装给不同的CEO的话, 需要重新弄, 完全干净的底座, 明白吗?」
2. **“动作可能大，先想清楚”**：
   > 「可能动作比较大, 你要好好思考清楚做出一个好的方案, 明白?」
3. **“run bundle 是每次安装出来的东西，不在 git”**：
   > 「我们这里一直没有弄清楚 run bundle 这个概念, 每次安装都应该出现一个run bundle,
   > 这个runbundle 不应该在GIT里面, 明白 ? 这样每次安装后才会是清爽的, 是不是?」
4. **“基部能力 vs 扩张能力，五角色一样”**：
   > 「不仅仅是CEO, 其他角色都一样, 我们可以养基部的能力, 但扩张能力需要安装后, 让用户去培养, 明白?」
5. **“有历史负担，先 research 再 issue，长期做对”**：
   > 「这里不简单, 我们有历史负担, 所以你要排摸清楚后出方案, 开始先research 等有数了再 issue, 明白?
   > 做对最重要, 不要短期...需要长期做对的思考.」
6. **“立 goal 把它做完”**：
   > 「好的, 那就setup goal 来都弄好吧」

**从原话提炼的意图（按优先级）**

| # | 意图 | 对产品的含义 | 对本次工作的含义 |
|---|---|---|---|
| I1 | 产品要能装给**不同的 CEO / 不同公司** | 安装产物只带基部；每次安装是独立单元 | 不能把本部署历史带出去；安装路径要可重复 |
| I2 | 每次安装出现一个 **run bundle**，且**不在 git** | 安装 = 创建一个运行单元；仓库只放产品 | 本仓的部署数据必须移出索引；bundle 要有身份 |
| I3 | 装完是**清爽的** | 首启只有骨架，没有别人的 journal/交付物/会话/方法层 | 干净要可机械验证，不靠口头约定 |
| I4 | **基部能力**可由我们养；**扩张能力**由用户装后培养 | pack 的方法/persona/手册/章程是基部；方法层、journal、交付物、台账、会话是扩张 | 基部进 pack；扩张只住 bundle；五角色同等 |
| I5 | **长期做对**，不短期糊 | 契约、升级、备份、隔离边界要一起想清楚 | 先 research 出数，再 issue；分阶段、每步可回退 |

**一句话目的**：把“产品源码”和“一个正在运行的部署”拆开——产品仓只留基部能力；每次安装产生一个
独立、可识别、默认干净的 run bundle，用户在自己的 bundle 里培养扩张能力；我们的历史一件都不随安装走。

## 为什么是现在（历史负担的来路）

- **2026-10-13 已做了一半**：制度件（手册/章程/org/模板/起动件）搬进 `packages/company-pack/workspace/`
  随包分发；host 首启“只补缺”地把骨架落到 `<DSH_HOME>/company-workspace`（[骨架 Note](../../../notes/implemented/2026-10-13-company-workspace-skeleton-shipped.md)、
  [首启 Note](../../../notes/implemented/2026-10-13-first-run-bootstrap.md)）。所以**新装的骨架已经是干净的**——本卡不是从零开始。
- **但只做了“骨架”，没做“安装单元”**：首启不写 manifest、不区分“新安装/复用 home”、不隔离第二个 CEO；
  复用 home 会共享 sessions、凭据、profile 方法层与 workspace 登记。
- **2026-10-13 瘦身只把 drafts 请出 git**：[瘦身 Note](../../../notes/archived/2026-10-13-workspace-slimming.md)
  留了成品、台账、journal、owners 在索引里；这是有意的半步（当时“成品是历史账”），但现在与 I2/I3 冲突。
- **2026-10-05/07 的“run bundle”是逻辑视图**：[repository-steerability](./2026-10-05-repository-steerability.md)
  明确否决“把一次运行复制成目录”。本卡要区分：被否决的是**复制证据**；现在要的是**部署单元**（live 权威本身）。
  两者不矛盾，但术语必须拆开（run bundle = 安装单元；四件套 = run trace）。
- **分发件已经漂了**：`_dist` 的 tarball 是 2026-10-05 的（139 条目、无 `workspace/`），当前 pack 会打出
  256 条目、23 个 `workspace/`；`dist-manual` 只比版本号，所以没 bump 版本就抓不到。给不同 CEO 的“那份包”
  现在不是 release-smoke 验过的那份。
- **不做的代价**：每个新 CEO 的安装要么复用我们的 home（拿到历史），要么靠人手清洗；基部升级永远到不了
  已安装的盘；每次都要重新解释“哪些文件能删”。

**问题与期望结果：**
本仓现在同时是“产品源码”和“一个正在运行的部署”：`company-workspace/` 里 146 件本部署数据在 git 索引里，
开发 home 704MB，`run bundle` 只是逻辑视图。用户口径（2026-10-24）：**每次安装都应出现一个 run bundle，
它不在 git 里；装完是清爽的；基部能力随产品走，扩张能力由用户安装后自己培养——五个角色一样，不只 CEO。**
期望结果：给出一个长期做对的安装单元契约与迁移路线，使新 CEO 的安装只带 base、不带我们的历史；
可机械验证；升级不擦用户长出来的能力；不丢现有数据。

**当前情况：**
- **骨架已经干净**：临时空 home 里一条 `plugin add` 自建 profile；首启只落 31 项出厂骨架（16 文件 + 15 目录），无 journal / 台账行 / 交付物 / 会话；二次 boot 零变更（[release-smoke](../../../checks/smoke/release-smoke.mjs) ⑥）。
- **仓库不干净**：`git ls-tree` 显示 `company-workspace/` **146 件 / 1.2MB** 在索引（94 archive 成品 + 12 live 成品 + 28 journal + 台账/owners/索引/1 条培养记录）；磁盘 166MB；`.git` 596MB；`runtime/harness-home` 704MB（sessions 160MB / profiles 513MB）。
- **安装单元没有身份**：首启不写 manifest、不登记 workspace、不区分“新安装”与“复用 home”；复用同一 home 会共享 sessions、`.credentials.yaml`、profile 方法层与 workspace 登记（4 条绝对路径）。
- **分发件已漂**：`_dist` 的 0.2.0 tarball 是 2026-10-05 的（139 条目、**0 个 `workspace/`**、基线 0.2.0-rc.2）；当前 pack 会打出 256 条目、23 个 `workspace/`、pin 0.2.1-rc.2。`dist-manual` 门禁只比版本号，版本没 bump 就抓不到。
- **能力分层已存在但未落到边界**：基部 = `presets/<role>/skills` + `workspace/` 骨架；扩张 = 方法层（`<home>/profiles/<p>/company-cultivation/<role>/`）、journal、培养记录、交付物、台账、会话。前者在 pack，后者现在部分在 git。
- 完整证据与逐项数字：[研究稿](../research/run-bundle/2026-10-24-run-bundle-boundary.md)。

**未决问题（需要用户拍板）：**
1. 是否采纳 **run bundle = 物理安装单元**（`manifest + 一个 DSH home + 一个 company workspace`），并把现有“四件套”改称 run trace（引用不复制）？
2. dev 部署去 tracked 的范围：只去 journal/台账/培养记录，还是**整盘**（含 finals/archive/owners/索引）？建议整盘——否则“run bundle 不在 git”只做了一半。
3. bundle 落点：**一个 DSH home = 一个 bundle**；第二个 CEO 新开 home（不共享凭据/方法层/会话）。接受吗？是否需要 `bundle init/list/status` 工具？
4. 升级策略：只补缺（现状，制度件永不升级）vs **哈希判定**（未改的基部文件随 pack 替换，改过的保留并报告）vs 手工 merge？建议哈希。
5. 迁移前的全量导出 + 之后 `bundle export` 的备份义务：本轮做，还是先记入路线？
6. 分发版本：是否 bump 到 0.3.0 并同 diff 重导 `_dist`（手册写清 workspace 与 bundle 步骤，门禁扩到内容而不只是版本号）？

**结论（2026-10-24）：** 用户授权按卡上建议推进（「那就 setup goal 来都弄好吧」），已按建议实施并交付：
[Note run-bundle-install-unit](../../../notes/implemented/2026-10-24-run-bundle-install-unit.md)。
六项按建议落定：① run bundle = 物理安装单元（四件套改称 run trace）；② dev 整盘去 tracked；
③ 一个 DSH home = 一个 bundle，第二个 CEO 新开 home；④ 哈希升级（未改的基部替换、改过的保留）；
⑤ 迁移前全量导出 + 备份口径；⑥ 0.3.0 + `_dist` 重导 + `dist-manual` 内容门禁。

**下一步：**
已实施并归档（保留正文）；研究稿已随迁到 `_backlog/_archive/research/run-bundle/`。**本卡不授予实施权限；实施授权 = 用户本轮指令 + RFC 状态行「批准：」。**

## 给第二个 review agent 的导读（purpose review）

**这张卡是什么**：一个**目的与边界**的讨论卡——回答“为什么做、做到什么算对、哪些不做”。
它**不是**实施合同；实施合同 = [已交付 Note](../../../notes/implemented/2026-10-24-run-bundle-install-unit.md)。
review 这张卡时不要先看代码，先回答：这些决定是否忠实于上面的用户原话。

**先读什么（按顺序）**
1. 本卡「原始意图」与「为什么是现在」——目的与来路。
2. [研究稿](../research/run-bundle/2026-10-24-run-bundle-boundary.md) §2（安装实测）、§3（历史负担量化）、
   §4（基部/扩张分层）、§5（泄漏模式）——事实。
3. 本卡「方案与取舍」与 RFC「验收」——选了什么、怎么证明；研究稿 §7 是被比较掉的方案。

**review 必须逐条回答的七个问题**
1. **意图保真**：I1–I5 每一条能否对回原话？有没有把用户没说的东西（如“多租户 SaaS”“自动登记 workspace”）
   偷偷塞进范围？
2. **术语**：把“run bundle”定义为**安装单元**（manifest + home + workspace）、把四件套改称 run trace，
   是否解决了用户说的“一直没弄清楚”？还是反而制造了第三次撞名？证据 = 研究稿 §1。
3. **干净判据**：只证明“骨架 31 项、无 journal/记录/会话”够不够？用户说的“清爽”是否还包括
   凭据、方法层、workspace 登记、sessions？本卡的隔离判据 = “新 home = 新 bundle”。
4. **分层完整性**：基部/扩张表（研究稿 §4）对**五个角色**是否都成立？有没有角色特例（CEO 的签字权、
   teammate 继承 Lead 组合、researcher 子人格）被误当成能力分层例外？
5. **迁移安全**：整盘去 tracked 是否会丢数据？本卡的答案是“先全量导出（workspace 含 ignored drafts + sessions），
   再 `git rm --cached`，工作树不动”；review 要检查这个顺序与恢复口径是否足够。
6. **升级与备份**：哈希升级（未改的基部替换、改过的保留）是否会把用户改过的制度件悄悄覆盖？
   `bundle export` 的排除面（凭据/logs/sessions）是否够？这两个是本卡认为“长期做对”的关键。
7. **范围**：排除项（DSH 上游、多租户 SaaS、GUI 自动登记、重写 git 历史、搬 snapshots）是否合理？
   有没有必须现在做、却被推到“以后”的？

**什么会证伪本卡（请优先找这些）**
- 用户说的 “run bundle” 其实是**每次运行**（一场动议）而不是每次安装——那么“一次安装一个 bundle”就错了，
  应改为 per-run 单元；本卡的证据是用户原话「每次安装都应该出现一个run bundle」。
- 第二个 CEO 本来就该**共享**同一个 home（例如同一台机器、同一操作者、只是换公司盘）——那么“新 home = 新 bundle”
  过强，隔离应改为“新 workspace + 方法层按公司隔离”。
- 基部升级可以**永远手工**（用户接受每次重装/手工 diff）——那么哈希升级是过度设计。
- 数据可以**不备份**（本仓 git 历史就是备份）——那么“先导出再 untrack”可省；但 ignored drafts/sessions
  不在 git，review 要确认这一点。

**review 时不要预设的上下文**
- 本仓是 DSH 的 company pack（一个插件包）+ 一个正在跑的部署；`company-workspace/` 是角色会话 cwd，
  `runtime/harness-home/` 是 DSH home（sessions/profiles/凭据/storages）。
- 五个角色（CEO / VP-Eng / VP-Sales / COO / CFO）各有 preset、CHARTER、skills；方法层按
  `profile × role` 隔离（`<home>/profiles/<p>/company-cultivation/<role>/`），不在 workspace 里。
- 基部 = pack 的 persona/skills/手册/章程/模板/起动件；扩张 = 方法层/journal/培养记录/交付物/台账/会话。
- 2026-10-13 已把制度件搬进 pack 并做了首启落盘；本卡处理的是**剩下的一半**：安装单元身份、整盘去 tracked、
  隔离、升级、分发件。

## 范围与排除项

**范围内：**
- run bundle 契约（manifest / home / workspace / 版本 / 生命周期）与“base vs grown”边界。
- 安装形状与验证：首启落盘、无历史、二次幂等、两 bundle 隔离。
- dev 仓库去 tracked 与消费者适配（gates / tests / tools / docs）。
- 分发件（`_dist`）重导与 `dist-manual` 门禁内容化。
- 迁移前的数据导出与恢复口径。

**范围外：**
- 改 DSH 上游（vendor 只读；需要上游修的先证伪再提 seam）。
- 多租户 SaaS、账号/身份体系、远程共享盘。
- GUI 自动登记 workspace（现在仍需人点一次；可另开卡）。
- 重写 git 历史（历史保留，`rm --cached` 只出索引）。
- 把 `snapshots/` 证据搬出仓库——证据是冻结测试资产，不是 live run bundle；如要动另立卡。

## 已知与未决

### 已知（有证据）
- 空 home 的安装/首启路径已实测（见研究稿 §2）；产品安装的骨架是干净的。
- 方法层按 `profile × role` 隔离，pack 升级不擦；CEO 无分层例外（[cultivation host](../../../packages/company-pack/src/host/cultivation.ts)）。
- 本仓 146 件 tracked 的具体分类与体量（研究稿 §3.1）。
- `company-skeleton`、`handbook-budget`、`ledger-participation`、`drafts-untracked`、`md-links` 都直接耦合“公司盘在仓库里”（研究稿 §6）。
- 2026-10-05/07 的“不物化 run bundle”否决针对**复制证据**，不针对**部署单元**；本次是把 live 单元命名并加边界，不是造第二权威。

### 未决（事实/设计缺口）
- 593 处引用只按面计数（docs 14 / tests 16 / checks 19 / tools 12 / probes 9 / notes 35），**没有逐文件映射**；阶段 2 前要补一张逐文件改动表。
- dev 的 home 与 workspace 是否最终合并到统一 bundle 根（方案 C）——取决于阶段 1 的 manifest 工具是否稳定；具体落点阶段 2 再定。
- 哈希升级的冲突报告形态（CLI 输出 / 日志 / 文件）未定。
- 两 bundle 并行的真实验证（第二个 home + 第二个 workspace + 方法层隔离）未跑；现有 `probe-two-instances.mjs` 只覆盖部分。
- `bundle export` 的排除面（凭据、logs、sessions）与恢复演练未做。

## 方案与取舍

| 方案 | 做法 | 干净 | 隔离 | 升级 | 迁移成本 | 风险 |
|---|---|---|---|---|---|---|
| A. 只 ignore | 整树 ignore，路径不动，补 manifest | ✅ | 靠约定 | 仍只补缺 | 小 | 第二个 CEO 仍可能复用 home |
| **B. 产品单根 + dev 双根 manifest**（推荐起点） | bundle = home + manifest；dev 的 workspace 仍在仓库根，manifest 声明外部根；整盘去 tracked | ✅ | ✅ | 记 skeleton 版本 | 中 | dev 与产品布局不完全同形 |
| C. 统一单根（目标形态） | dev 也搬进 `runtime/bundle/{home,workspace}`，根 `company-workspace` 只留兼容链接 | ✅ | ✅ | 同上 | 大（session cwd/登记/文档） | 迁移期断链 |
| D. 产品/部署双仓 | 数据仓单独 clone/备份 | ✅ | ✅ | 同上 | 最大 | 跨仓审计；单人维护者负担 |

**推荐 B → C 分阶段**：先把契约（manifest + home + workspace + base/grown 边界）和干净仓库拿到手，
不搬 704MB home、不改 593 处路径；等 manifest/工具/门禁稳定后再合并布局。A 不够（不解决复用 home）；
D 现在过度（与 2026-10-13 瘦身轮的判断一致）。

**首个切片的形状（若用户拍板“做”，仍需另立 RFC）：**
1. 冻结基线 + 全量导出（workspace 含 ignored drafts + sessions）。
2. manifest + 首启写入 + “workspace 文件集 = 骨架集，多一件即报”。
3. `_dist` 重导（版本 bump + 手册重写 + 门禁内容化）。
4. dev 整盘去 tracked + 消费者逐文件适配。
5. 升级哈希 + `bundle export`。
6. 两 bundle 隔离的真实验证。

## 关闭条件

- 用户对 §未决问题 6 项给出明确答复（可改建议），本卡记录结论与去向。
- 若“做”：把结论交接为 `notes/proposed/` RFC（含验收标准），本卡归档并保留文件名。
- 若“以后做”：写清重启条件（例如“第二个 CEO 的安装需求出现”“pack 升到 0.3.0 前”）。
- 若“不做”：写清原因与适用范围。
- 任何情况下都不在卡上实施；实施须另获授权。
