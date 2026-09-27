# 2026-09-27 · FAQ 07 对照审计：本仓 harness 质量十维打分与差距

状态：archived（完结审计，2026-09-27。喂给谁 = 维护者与后续打磨轮；毕业动作 = 行动项已登记
ROADMAP §磨清单两条，本稿兼任**十维基线快照**——复测时对照本表重新打分即可，不必重读 FAQ）。

## 输入与方法

- 材料：`/Users/bowhead/deepseek-harness/_faq_on_digested/07_borrowing-dsh-harness-idea/` 全 16 文件
  （question/answer + 道 01–05 + 落地总纲 06 + 术 07–13 + 框架 14 + reference/research）——该 FAQ 的主题是
  「另一个项目怎么借 DSH harness 思想」，自带评估框架。
- 框架：三条立场（agent 一等参与 / 规则可执行 / 事实唯一 owner）→ 十维评估（道五维+术五维，
  每维 没有 / 有但不成体系 / 像回事）→ 垂直切片（一笔真实变更五问走查 + 红灯对照）→
  四边界（可读≠简单 / Skill≠enforcement / 清理≠回滚 / 查询≠沙箱）。
- 对照对象：本仓 @ `c72ee20`（树干净；`pnpm verify` ALL PASS、`pnpm test` 238/238、墙钟 1.27s——本稿实跑复核）。
- 与既有台账的关系：[harness-alignment-ledger](./2026-09-25-harness-alignment-ledger.md) 判定的是
  《Agent-ready Development》语料 27 篇；本稿判定 FAQ 07 的框架对本仓自身——补充而非重复，结论兼容
  （该台账 9 项已对齐里含归属表、测试分层等，本稿在它的基础上只找残余缺口）。

## 十维打分（档位 + 证据 + 最痛缺口）

| 维 | 档位 | 证据（实跑/实读） | 最痛缺口 |
|---|---|---|---|
| 变更闭环 01 | 像回事 | `db1e89e` 单 commit = 实现+手册+skill+测试+Note+intents 行；commit message 载两项决定与验证清单 | 红灯对照非每笔常规动作（本稿实测补上，见下节）；无 Issue 模板 = 单人仓规模前提不符，不算缺口 |
| 归属 02 | 像回事 | one home 成文化（D28「枚举事实的家=实现」；「复述必漂」多处自警）；35 条观察档按「档案不篡改」正确分档 | `kb/owners.md` vs `OWNERS_TABLE`（routing.ts）双家在案（磨清单，红线未批） |
| 决策记录 03 | 像回事 | implemented 66 份（2026-09-27 计数）+ 状态行 + 备选必载 + 毕业改写 + 取代检查 + D30 research 三态（`research-liveness` 门禁看守） | 无实质缺口（rejected 桶刚立即近空 = 刻意形状） |
| 静与动 04 | 像回事 | 会话事实源归 DSH session log；排练场/真盘分离；派活行**双源核对 + stale 标记** = 机械防分叉；审计脚本统一 requireDevHome 拒日用 home | journal 轮末收敛只由人做（实测 ceo 19KB / cfo 20KB 在盘）；「日期待核」占位 = 回填债在积 |
| 正确路径 05 | 像回事 | architecture §10 改动归属表（改什么 → 首选落点 → 该面最小验收，右列全可执行）+ §9 升级路径预埋不预建 | 无实质缺口（归属表两跳可达：AGENTS 布局表 + index 术语映射覆盖首跳） |
| 入口链 07 | 像回事 | `CLAUDE.md` symlink（门禁看守）；根 108/115 行；子树 AGENTS.md 只在有专属常驻规则处（company-workspace = 成员会话注入基线，属产品功能）；物理行预算棘轮 | **三文档顶格**（AGENTS 108/115、index 148/149、dev-loop 466/466）= 常驻层饱和信号，加行成本已高 |
| 执行链 08 | 像回事（继承） | 管线归 DSH 插件 API（本仓不建 loop，D13）；本仓义务收缩为设计四问（§3）+ 不越界；entry/execution 链债已于 2026-09-26 清（entry-probe 12/12） | 设计四问属 prose 无门禁——但「漏日志税在 replay 还债」预警已写进 §3 本身 |
| 反馈 09 | **有但不成体系** | `pnpm verify` 全门禁（清单唯一源 = `scripts/verify.mjs`；2026-09-27 实跑 20 行 PASS）+ test 238 + layering 守卫（带反证）+ script-triggers 自述门禁 + 新门禁反证口径成文（dev-loop §12） | **结构性缺口：enforcement 通道断层**——无 git hooks、无 CI，「push 前跑 verify」本身是 prose；另有：门禁反证记录无事实家（哪些门禁留证过反例，无清单可查） |
| Skills 11 | 像回事（偏弱） | 10 个 SKILL.md：触发条件进 frontmatter description、步骤带具体工具动作、判据成规则（「没写 = 会议未收口」）、格式事实家链接（派活行格式唯一见手册——不复制） | 缺 FAQ 11 写法三件套：① guidance≠checklist 边界声明；② 命中先读全文纪律；③ 可机械部分指向门禁 |
| 披露 13 | 像回事（继承） | DSH 运行时机制（catalog 只给摘要 / maxBytes / touch-driven 注入）；member 会话注入面实测 ≈ 手册 11KB + CHARTER 5–9KB + persona prefix——远低于 dsh-base 默认 65,536B 预算 | 无压力信号（上下文未爆过）；注入总量无监控口径 = 观察项，按「有压力再借」不动 |

## 垂直切片（`db1e89e` 结构化派活字段，2026-09-27 走查）

| 环 | 结果 |
|---|---|
| ① 用户可观察结果 | ✓ commit message 写得出（stale 标记进 eval 详情行；状态枚举进手册） |
| ② 不靠带路找 owner | ✓ ROADMAP 搁置池行 → 毕业稿 §结论 → 手册/skill/lib/测试各就位；architecture §10 亦能指路 |
| ③ 持久取舍记在哪 | ✓ 实验 B 金标准（labels.md 人复核转正）+ 用户裁定（seam 稿留本仓）+ intents/note/ROADMAP 三处指针互链 |
| ④ 红灯对照 | ✓ **本稿实测**：`git show db1e89e^:scripts/lib/candidate-scan.mjs` 回滚实现、保留当前测试 → vitest 恰 **3 红**（新增双源核对）**9 绿**（旧有）；还原后树净。证据与声称对齐成立——但交付当时未留此记录，本条属抽查补证 |
| ⑤ 证据状态标注 | ✓ 全部可指文件；无「只有口头说法」项 |

## 三问自检

知识外置 ✓（66 Note + D 台账 D1–D30 + 手册 + 归属表）；正确入口 ✓（AGENTS → index → dev-loop → owner，
术语映射直达 vendor 源码）；**错误何时被发现 —— 本地层好、通道断层**：verify 本身是 enforced，
但「何时跑 verify」靠 prose（无 hook / CI 兜底，漏跑不产生任何信号）。

## 四边界核对（防自己学走形）

可读≠简单 ✓（门禁各自有 owner，未为可读性牺牲检查）；Skill≠enforcement ✗（skill 未自我声明边界——行动项）；
清理≠回滚 ✓（registrations are effects、卸载即 unwind 已内化）；查询≠沙箱 △（dev-loop §2 进程内查询节
未提「inspect 不是授权边界」——小补候选，并入磨清单收尾项）。

## 结论：gap 有多大

**道侧差距 ≈ 0**——本仓本就按 DSH 纪律建仓（27 篇 alignment 已过一遍，9 项已对齐）；**术侧唯一结构性缺口 =
反馈的 enforcement 通道**：DSH 立场 2 的最后一公里（gates 已备、门没接电——「Agents follow enforced gates
far more reliably than prose conventions」同样适用于「记得跑 gates」这件事本身）。其余为收尾级：
skill 三件套、反证账、常驻层顶格压力。以 FAQ 06 的「像回事」总验收看：**十维中九维达标或继承达标，
反馈维差在通道而非检查本身**——已经超过 FAQ 的 MVP 线，处于「一轮定向打磨即可全绿」的位置。

## 技术债盘点（2026-09-27 口径）

在案（handoff / ROADMAP 已登记）：① owners 双家（红线未批）；② renewal-y-2026 逐文件归属；
③ dev home 探针残留；④ 真盘两个「你好」空会话（待人点头）；⑤ quote-z 版号遗留（待人确认）。
本稿新发现：⑥ **无 git hooks / 无 CI**（enforcement 通道断层）；⑦ 门禁反证记录无事实家；
⑧ skill 边界三件套缺失；⑨ 三文档预算顶格（常驻层饱和信号）；⑩ journal 收敛依赖人 +
「日期待核」占位在积（观察项，无压力不动作）。

## 分级行动清单（思想借鉴，非照抄实现）

**立即借（低成本高收益，待用户点名即做，均已入 ROADMAP 磨清单）**：

1. **enforcement 通道**：git pre-push hook 接 `pnpm verify`（秒级、全门禁、装完即受益）；
   负例控制 = 装好后故意改坏一个链接推一次看它红。可选第二档 = 最小 CI workflow（verify + test ≈ 2min）。
   ——把「gates 存在」升级成「gates 必然被跑」，正中立场 2。
2. **skill 三件套**：10 个 SKILL.md 补「guidance 不是 checklist / 命中先读全文 / 可机械部分指向门禁」；
   dev-loop §2 补一句 inspect≠授权边界。完成定义 = preset-smoke（真挂载）。
3. **反证账盘点**：对照 `scripts/verify.mjs` 清单列哪些门禁有留证反例、哪些缺；缺的按
   「只回滚实现、保留测试」口径补做，留证进各门禁出生 Note（不新建体系——事实的家紧挨实现，D28）。

**有压力再借**：member session 注入预算监控（token 压力出现时）；CI 全矩阵（第二贡献者进场
或「忘跑 verify」成为实际频率时）；十维复测（下轮打磨或升 pin 时对照本表）。

**不照搬（已守住，继续守）**：插件图 / 生成 catalog / invariant 架构（D1 单包 + D13 不发明，
FAQ 10 自己也把它排最后）；双语 triplet；Issue 模板与加权批准（协作规模前提不符）；
红灯对照强制到每笔行为测试（对单人+代理仓过重——维持「新门禁必反证、行为测试抽查」现形）。

## 登记与指针

- 本稿兼任十维基线快照；复测入口 = 本表 + FAQ 06 Phase 1（评估 → 定向打磨 → 复测）。
- 同批登记：ROADMAP §磨清单 +2 行；docs/index.md §外部研究材料登记 +1 行（149/149 顶格内）；
  notes/intents.md +1 行指针。
