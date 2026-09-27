# 2026-09-25 · Harness 对照台账：以《Agent-ready Development》为镜

状态：**活参考（消费者 = dev-loop §9.1 判据三句 / docs/index / architecture / README 四处活引用）**——喂给谁 = [dev-loop §9.1](../../docs/guides/dev-loop.md) 判据三句、[docs/index](../../docs/index.md) 与
[architecture](../../docs/design/architecture.md) 的对照登记、[company-pack README](../../packages/company-pack/README.md)；
不照搬清单 owner = 本文 §四.4；阶段任务已交付（阶段 1 台账 + 三切片 C `ed633d0` / B `8a90332` / A `15ea897` 落地；
主会话亲读 15 篇逐条判 + 四路阅读代理交叉核对；判定二分、无「待定」）。**毕业动作**：四处引用面各自消失时按三选一处置（预期为"仍在用"长期保留——它是那四处的**唯一出处**，不是待办）。

> 语料：`/Users/bowhead/deepseek-harness/_agent_ready_development/`，钉 DSH commit `46a7f68b` =
> tag `dsh-v0.1.7-rc.1`（**比本仓 pin `rc.2` 差一个 tag**——只吸收理念层结论；机制细节一律回
> `vendor/dsh/` 复核；跨 rc 机制差异已实证两处，见 §五）。owner RFC =
> [implemented/harness-alignment](../implemented/2026-09-25-harness-alignment.md)。
> 判定三值：**采纳切片** / **已对齐** / **本仓不适用**（触发型不适用项一律带复活条件）。

## 总判（一句话）

本仓 harness **已接近语料主张的形态**（RFC 预判成立）：15 篇逐条判里 **9 篇已对齐、3 篇采纳切片、
3 篇本仓不适用**；快读 12 文件抓出 **5 个真新形状**，其中 3 个并进采纳切片、2 个判不适用/已覆盖。
**没有大改**——落地收敛为三个小切片（§四），其余全部"已对齐 + 证据"或"不适用 + 理由"。

## 一、逐条判（15 篇）

### 主题 A · 入口与归属

**repo-harness/01-follow-a-fresh-agent**（fresh agent 六问：先读什么/放哪/为什么/流程/完成/进主线）
- 本仓现状：六问各有唯一 owner——AGENTS.md 布局+入口链 → [index](../../docs/index.md) 四层表+术语映射 →
  [dev-loop §0.5/§1](../../docs/guides/dev-loop.md)；交付记录 = §1 五步；完成即离队 = ROADMAP；还比语料多
  intents.md 意图登记与 proposal 双门禁（verify）。
- 差距：无（"行为归属表"缺口归 04 判定；远端反馈层归 05 判定）。
- **判定：已对齐**。被否：为"fresh agent 视角"另写一篇导览——六问已被入口链覆盖，加文档只会造第二事实家。

**repo-harness/02-legibility-and-ownership**（"Each fact has one home"；负知识也要 owner）
- 本仓现状：D10 一处事实一个家（AGENTS 纪律表 + index 台账）；当前事实/决策理由分离（docs 只写 now，
  理由归 notes）；负知识 = 各 Note「输掉的方案」节 + postmortem/；lifecycle 六细则 = dev-loop §12
  （2026-09-24 点选吸纳自 sdlc-reference/01，含四项显式不吸纳）。
- 差距：① 曾有一处「rejected 目录」的写法在 AGENTS.md 里但目录不存在——**已随「打扫卫生·记事面」处置**
  （2026-09-25 裁断：**不设该目录**，否决理由归各 owner Note 的「输掉的方案」节）
  （2026-09-25 裁断：不设目录，负知识随「输掉的方案」节）；② 生成目录（module-graph 等）——单 pack 仓无此规模，手工表+verify 门禁足够。
- **判定：已对齐**（rejected/ 缺席已处置）。生成目录 = **本仓不适用**（规模差一个量级；语料自己也把它
  定位为大规模仓库的 index 手段）。被否：建 rejected/ 目录树——负知识已有家（输掉的方案节），开目录
  反而造空壳（02 篇原话："只在仍能阻止一个合理错误时保留"）。

**repo-harness/08-repository-taxonomy**（分区各辖其职；五种维护形态；证据跟 owning 层走）
- 本仓现状：分区职责成文 = AGENTS.md §布局（单包仓 owner 集中成立）；五形态占"手写+录制"两类
  （手写受 verify 门禁、snapshots/ 只收回放 fixture + 世代不删）；vendor = submodule 钉版 + 只读铁律
  （取 pinned+auditable，显式放弃 patchable = 零改动故无 local modifications log——三条正路见 AGENTS）。
- 差距：tests/ 集中放置（21 spec 各对应一面）是有意选择但未成文——一句声明可并进切片 A 的归属表。
- **判定：已对齐**（单包仓的正确简化，语料 07 亲为此背书："较小项目……不需要复制全部包结构"）。
  生成/混合/投影三形态 = **本仓不适用**（无 codegen 文档管线）。被否：per-directory README/AGENTS——
  目录少且 AGENTS §布局已是一张表，按目录复制 owner 会繁殖维护面。

### 主题 B · 规则-技能-反馈

**repo-harness/03-skills-as-procedural-memory**（规则与检查之间缺一层：development Skill）
- 本仓现状：开发侧判断过程住 [dev-loop](../../docs/guides/dev-loop.md)（§1 最窄检查、§9.1 按面选档、
  §2 调试阶梯），422/440 行预算内；"Skill≠gate"同构物 = tests/layering.spec.ts（散文变断言）；
  两种 Skill 之分本仓天然成立（preset skills = 产品面；开发面无第二套）。
- 差距：无 `.agents/skills/`——但单操作者 + 判断流程集中一个文件，无复用压力；D13「不发明」反对预建。
- **判定：本仓不适用（现阶段）**。触发条件：**第二贡献者进场或出现 PR/pre-push 面**（与 OpenSpec 同触发，
  dev-loop §5）——届时把 §9.1「按面选检查」抽成最小 skill（1 个文件，正文=表格展开+链接回 dev-loop，不复制）。
  被否：现在预建 skills 家——为尚不存在的复用压力付维护成本，违 07 篇"过细的 Skill 会把普通判断固化成仪式"。

**repo-harness/05-executable-feedback**（六层反馈各证其性；负例证明；本地/远端分工）
- 本仓现状：机械承诺全进 verify（每条带 why+修法=错误信息三要素）；反证有纪律有实例（AGENTS 纪律表
  "每个新门禁带反证"；preset-smoke/layering 双红证）；verify the world not self-report = deliverables-check
  三态审计 + D15 真入口；分层 = §9.1 八档。
- 差距：① §9.1 表按"时间/跑什么/何时"切，**未按层标"能证明/不能证明"**——RFC 自认的缺口；
  ② CI/.github/Git hooks 远端层整体缺席（单人直推）。
- **判定：采纳切片（§9.1 证明边界标注，并入切片 A）**；CI/hooks = **本仓不适用（现阶段）**，
  触发条件同上（第二贡献者/PR 面）。被否：现在上 CI——无 PR 面时 CI 只是慢一拍的 verify 复读机。

### 主题 C · 正确路径与参与

**repo-harness/04-paved-road-and-participation**（两张地图；四级参与阶梯；五问归属法）
- 本仓现状：两张地图同构（`--dump-config` 组合层 + 会话 JSONL/replay）；阶梯等价物分散但齐全
  （§4 五装法 / architecture §9 升级路径 / 设计四问 / vendor 三条正路 + 铁律封死 L3）；生命周期一套
  （client 侧 ctx.effect+disposer 实例在案）；SessionEventMap 横切义务 = 设计四问②日志税（逐义同构）。
- 差距：**无单张"改动归属表"**——fresh agent 要拼三个地方才能答"这个改动放哪/什么算完成"。
- **判定：采纳切片（~10 行归属表：改什么→去哪个面→该面验收；并入切片 A）**。放
  [architecture](../../docs/design/architecture.md) §9 近旁（不动目录归属，避开红线）。

**repo-harness/09-plugin-author-entry**（插件作者入口：是什么/怎么装/怎么组合；两仓同词汇）
- 本仓现状：是什么 ✓（README + pack README 三面表）；怎么组合 ✓（bundle patch 数组 + compat 矩阵 +
  `apply(ctx)` 最小定义真实在用）；词汇对齐 ✓（AGENTS 术语 + index 术语映射）；**怎么装 △**——
  两个 README 均无安装节；pack README:11 把安装冒烟列为"R5 待办（发布前）"，**但 release-smoke 已在
  ① 换基座收官落地且 ALL PASS**——该行已过时。
- **判定：采纳切片（README 安装节 3 行 + 修 pack README:11 过时待办；切片 C）**。教程线 = 不适用
  （我们是插件仓非框架仓）。被否：等"真实 npm 发布"再写安装节——`dsh plugin add file:<tarball>` 的
  安装形状今天已可写且已被 release-smoke 证明，写"等发布"是假门槛。

### 主题 D · 运行时可检查性

**repo-harness/06-runtime-inspection**（三查询面：配置树/静态注册/进程内）
- 本仓现状：查询一已成合同工具（dev-loop §2 组合层；其盲区"config 校验看不见"已实证成反例）；
  查询三（`cordis_inspect_list/query`）= **升 pin 收割项已登记**
  （上游增量报告收割项⑤⑬；该稿已随收割轮收口毕业删除）；跨 rc 陈旧指针一处：ui-demo.md:111 引用 rc.2 已退役的旧单工具形
  `cordis_inspect what:"client"`。
- **判定：采纳切片（绑收割轮：双工具落地时调试阶梯补"进程内查询"一档 + 修 ui-demo 旧引用 + 登记
  `--dump-config-schema`；修旧引用并入切片 C 立即做）**。生成 catalog/freshness = **本仓不适用**
  （DSH 本体机制）。被否：本条独立落地 inspect 工具——RFC 明定与收割项合并处理，避免重复立项。

### 主题 E · 边界与成本

**repo-harness/07-boundaries-and-costs**（三问体检；四边界；为什么不照搬；迁移优先级）
- 本仓三问自检（**全过**）：①规则住在哪里 → AGENTS/index/verify 门禁；②正确入口 → dev-loop §0.5/§1 +
  index 路由+术语映射；③错误何时发现 → verify(秒)→keyless test→preset-smoke(真挂载)→release-smoke→
  认证档（真模型/浏览器），反证实例三处。
- **判定：已对齐**（简化结构正是语料推荐形态）。产出：**「不照搬清单」落本台账 §四.4**（语料 07 亲述
  "DSH 的完整结构不适合照搬"——我们显式不照搬的：生成 catalog、双语 pairing、文档站投影、CI/PR/
  加权评审面、per-directory owner 文件、skills 家〔现阶段〕）。
- 被否：把"三问"写进 AGENTS 当常设指令——三问是**体检工具**不是每轮指令，记台账即可（AGENTS 预算 106/115）。

### 主题 F · SDLC 面六篇（sdlc-reference 03/05/06/09/10/11）

**ref-03 plan-and-sandbox**：Plan Mode 政策唯一 owner = dev-loop §0.5；Plan↔Note 分工已随 01 吸纳
（毕业=正文改写）；计划质量模板是 deployment 选择不照抄（语料明示）。**判定：已对齐**。

**ref-05 prose-doc-standards**：one-home=D10；只写 now；doc-budget/链接门禁对应语料预算/配对；
双语/文档站/生成 catalog = 不适用（单语、无站）。**判定：大体已对齐**；一个采纳小件：
`dsh-trim-cot-leakage` 判定问（"只拿 HEAD 的读者能否核验每个 claim"）→ **挂「打扫卫生·记事面」收尾清扫输入**
（已随该条进清扫契约，不新开条目）。被否：在本仓建 doc-sync 命令——文档量一个 verify 管得过来。

**ref-06 review-and-human-role**：三层分工本地版 = §9.1 + D15 + "入口探针机器通过不等于语义审阅通过"
（dev-loop 已有同构句）；运行时人审 = request_signoff/attention-e2e。缺一条 agent 行为纪律：
"收到反馈：成立就修复并补证据，不成立用技术事实反驳，**不作表演式同意**"。
**判定：采纳切片（dev-loop §12 加 2-3 行；并入切片 B）**。dsh-code-review skill 化 = 不适用（D13，无 review 面）。

**ref-09 intake-and-work-items**：意图载体 = 口述→intents.md→proposed RFC→ROADMAP 队列（+ proposal
双门禁、搁置池准入判据）；proposed Note=RFC 已随 01 吸纳。Issue 模板/状态机/标签 = 不适用（单人无外部通道）。
**判定：已对齐**（载体治理强于语料最小形状）。可选 1 行：将来用 TODO 标记时先定义三档语义（现在无约定，
不预建）。

**ref-10 approval-gate**：无 PR 流 → 加权批准/delegate/blame 整套不适用；运行时审批面
（fail-closed + 显式人批 + attention-e2e 全回路）方向一致且是本仓已有创新。**判定：本仓不适用为主，
运行时面已对齐**。被否：给红线决策建"审批分"——单人仓里红线就是"先报人"，加评分是把简单事做复杂。

**ref-11 release**：显式人工动作 ✓（sync-dsh 人审 JSON + private 未发布声明）；rehearsal ✓
（release-smoke 按需跑，规模裁剪合理）；vendor pin 簿记 = "版本落库+人打 tag"的本地投影。
**判定：已对齐**。前瞻（触发型，记 §五不实现）：真实发布时给发布脚本加 **registry 三态**
（无→publish / sha512 同→skip / 异→fail"改内容没升版"）+ "改内容必 bump"红线。

## 二、快读组（12 文件：只抓没见过的形状）

| 文件 | 判定 |
|---|---|
| ref-02 issue-pr-lifecycle | 无新形状（不适用：无 .github 面）。备用原则留档："待校验输入"与"执行校验的代码"分离——加 CI 时适用 |
| ref-04 gates-and-local-checks | **新形状**：`change-scope` outgoing 差异机械解析 + focused coverage 双指定 → **本仓不适用（现阶段）**：单人单线 `git diff` 即我们的 change-scope，机械化收益低；触发条件同 CI/PR 面。"按 outgoing scope 选最小证据"原则已由 §9.1 承载 |
| ref-07 push-merge-stacked-prs | 无新形状（不适用：无 stack/PR 面） |
| ref-08 example-web-seam | **新形状（轻）**：证据边界表（"能证明/不能证明"两栏）→ **采纳**，与 05/06/07 的"按层标证明边界"同件事，并入切片 A |
| tut-01 follow-a-change | 无新形状（任务面/完成定义/同 diff 证据 = §1 已覆盖） |
| tut-02 specs-and-decisions | **新形状（判据级）**：Note 豁免判据 → **采纳**（切片 B）："需要 Note 的信号 = 真实替代方案 + 持久取舍，不是 diff 大小" |
| tut-03 github-flow | 无新形状（不适用：无 GitHub Flow；本地门禁=同思想本地版） |
| tut-04 implementation-and-evidence | 无新形状（红灯对照=既有反证纪律）。**操作教训采纳**（切片 B）：反证必须**只回滚实现、保留新测试**——连测试一起回滚会得全绿假象 |
| tut-05 review-and-merge | 无新形状（知识归位三问由 D 号台账+notes 树承载） |

## 三、特殊文件

- **语料根 README**：**无新形状**——"两仓沿用同一词汇"本仓已实践（index 术语映射）；"每子目录为什么存在+
  何时改"的目录契约表是好 README 写法非机制（我们 AGENTS §布局 同效）。
- **语料根 verify.mjs**：对照后我们缺三个门禁形状——a) 目录 README 必备 = **不适用**（目录少，AGENTS §布局
  是一张表）；b) 孤儿资产 = **不适用**（本仓无图，snapshots 资产均有 snapshot.yml 引用；真出现资产再立）；
  c) 外链钉版 = **已对齐（习惯层）**：research notes 引 GitHub 一律钉 commit（delta note 实证）；机械化为
  门禁的收益低于成本，**登记给「打扫卫生·记事面」**（链接腐化是其辖区；已裁定：不机械化，习惯层已钉版）连带处置。d) 禁引隔离词表 = 不适用
  （本仓反向：显式登记引用 _digested）；SVG 门禁 = 不适用（无图）。
- **_coverage/**（语料自我维护）：**本仓不适用（形态已覆盖）**——对应物 = vendor 簿记（钉定基线+升 pin 重校
  总则）+ D 号台账 + intents 历轮记录；"上游路径→受影响文档"的逐路径触发表由**每次升 pin 产一篇 delta/impact
  note 实例化承担**（① 换基座刚实证）；常驻映射表会随 vendor 演进腐烂（07 篇维护成本警告亲对此判）。

## 四、采纳项汇总 → 阶段 2 切片清单

1. **切片 A「改动归属表 + 证明边界」**（收割 04+05+06+07+08+ref-08 六篇）：
   - dev-loop §9.1 各档补"能证明/不能证明"标注（预算内，不加行数）；
   - architecture §9 近旁加 ~10 行**改动归属表**（改什么→去哪个面→该面验收），并带一句
     "tests/ 集中放置是有意选择"（08 微声明）。
2. **切片 B「判据三句」**（收割 tut-02+tut-04+ref-06 三篇）：dev-loop §12 加——
   - Note 豁免判据（真实替代方案+持久取舍，非 diff 大小；豁免=决定理由以外的事实都有 owner）；
   - 反证操作（只回滚实现、保留新测试）；
   - 非表演式反驳（成立修复补证据，不成立用技术事实反驳）。
3. **切片 C「入口过时指针修正」**（收割 09+06 两篇）：根 README / pack README 补 3 行安装节
   （pack 名 + `dsh plugin add file:<tarball>` + 装后五角色可见）；修 pack README:11 过时的
   "R5 待办"（release-smoke 已落地）；修 ui-demo.md:111 的旧 `cordis_inspect` 单工具引用（rc.2 已退役）。
4. **不照搬清单**（07 产出，本台账即 owner）：生成 catalog+freshness、双语 pairing、文档站投影、
   CI/PR/加权评审/hooks 面、per-directory owner 文件、`.agents/skills/` 家、change-scope 脚本、
   集中式维护台账——全部**触发型**，复活条件统一 = 第二贡献者/PR 面/真实 npm 发布（各自注明）。
   阶段 3 在 index 适配叙述加一行指针到本节（不复制内容，one-home）。

## 五、登记给其它条目 / 前瞻

- → 「打扫卫生·记事面」（notebook-hygiene，**已交付**）：rejected/ 已裁断（不设目录）；trim-cot-leakage
  判定问已进清扫契约；外链钉版已裁定（不机械化，习惯层钉版）；升 pin 旧机制引用扫描已落 dev-loop §5。
- → 收割轮（升 pin 待续项）：inspect 双工具落地时调试阶梯补"进程内查询"档；`--dump-config-schema` 登记。
- → 前瞻（触发型）：真实 npm 发布时 registry 三态 + 改内容必 bump；CI/PR 面出现时 change-scope/skills 家/
  hooks 复活评估；TODO 三档语义（开始用 TODO 标记时先定义）。
- 跨 rc 教训（已实证两处）：ui-demo.md:111 旧工具引用、pack README:11 过时待办——**升 pin 的
  "流程合同对 vendor 重校"应包含"旧机制引用扫描"**，登记给 ② 一并纳入腐化清单来源。

## 六、覆盖矩阵（验收工具）

| 文件 | 判定 | 记录处 |
|---|---|---|
| repo-harness/01-follow-a-fresh-agent | 已对齐 | §A |
| repo-harness/02-legibility-and-ownership | 已对齐（rejected/ 登记 ②；生成目录不适用） | §A |
| repo-harness/03-skills-as-procedural-memory | 本仓不适用（现阶段；触发=第二贡献者/PR 面） | §B |
| repo-harness/04-paved-road-and-participation | 采纳切片 A | §C |
| repo-harness/05-executable-feedback | 采纳切片 A（CI/hooks 不适用+触发） | §B |
| repo-harness/06-runtime-inspection | 采纳切片 C+收割轮（生成 catalog 不适用） | §D |
| repo-harness/07-boundaries-and-costs | 已对齐（不照搬清单 → §四.4） | §E |
| repo-harness/08-repository-taxonomy | 已对齐（微声明并入切片 A） | §A |
| repo-harness/09-plugin-author-entry | 采纳切片 C | §C |
| sdlc-reference/03-plan-and-sandbox | 已对齐 | §F |
| sdlc-reference/05-prose-doc-standards | 已对齐（判定问登记 ②） | §F |
| sdlc-reference/06-review-and-human-role | 采纳切片 B（skill 化不适用） | §F |
| sdlc-reference/09-intake-and-work-items | 已对齐（模板/状态机/标签不适用） | §F |
| sdlc-reference/10-approval-gate | 本仓不适用为主；运行时面已对齐 | §F |
| sdlc-reference/11-release | 已对齐（registry 三态=前瞻） | §F |
| sdlc-reference/02-issue-pr-lifecycle | 无新形状（不适用；备用原则留档） | §二 |
| sdlc-reference/04-gates-and-local-checks | 新形状→不适用（现阶段；触发=CI/PR 面） | §二 |
| sdlc-reference/07-push-merge-stacked-prs | 无新形状（不适用） | §二 |
| sdlc-reference/08-example-web-seam | 新形状（轻）→采纳（并入切片 A） | §二 |
| sdlc-tutorial/01-follow-a-change | 无新形状（已覆盖） | §二 |
| sdlc-tutorial/02-specs-and-decisions | 新形状（判据级）→采纳（切片 B） | §二 |
| sdlc-tutorial/03-github-flow | 无新形状（不适用） | §二 |
| sdlc-tutorial/04-implementation-and-evidence | 无新形状；操作教训→采纳（切片 B） | §二 |
| sdlc-tutorial/05-review-and-merge | 无新形状（已覆盖） | §二 |
| sdlc-tutorial/00-index（+各 README） | 无新形状（目录契约表=好写法非机制） | §二/§三 |
| 语料根 README.md | 无新形状（两仓同词汇已实践） | §三 |
| 语料根 verify.mjs | 三缺形状：两不适用一登记 ② | §三 |
| _coverage/00-corpus-maintenance（+README） | 本仓不适用（形态已覆盖；常驻表会腐） | §三 |

**矩阵自检：27 行全覆盖，判定三值之一，零「待定」。**
