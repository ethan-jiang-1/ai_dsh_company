# 2026-09-26 · 多人协作的 UX：门的边界、话题对齐、并发可见性（提案）

状态：proposed（用户 2026-09-26 在真盘跑完一场多人动议后提出；**只要方案推敲，不动手**）

## 问题（用户原话还原 + 真盘实测）

1. **门的边界不清**：CEO 起一个话题 = 他的一扇新会话。**CFO 的人看得到 CEO 的会话**，可一打开
   是 CEO 的上下文——"这就不对了"；可自己新建一扇，又**跟 CEO 那个话题对不上话**。
   "CFO 能看到 CEO 的 session 好像也不太 make sense。"
2. **立刻对齐**：物理人针对某话题由 CEO 启动，**CFO / COO 的人怎么立刻对齐到那件事**？
3. **完全靠文件系统的代价**："你咋知道这个文件被锁住了？你不能改。"

**实测踩到的坑（同一场）**：新建会话的 **preset 默认 = `ceo`** ⇒ 用户开第二扇门想当 CFO 的门，
实际开成了**第三扇 CEO 的门** ⇒ CFO 的稿与纪要由 CEO 的会话代笔。
**而 `journal-audit` 查不出来**——它只查"在场"，不查"作者"（查在场 ≠ 查署名）。

## 先分层（三层正交，别混着谈）

| 层 | 问题 | 现状 |
|---|---|---|
| **L1 门** | 侧栏里**哪些会话属于我**？ | 按 workspace 过滤 ⇒ 同一个盘 = 同一个列表 ⇒ 各人看得到彼此的门 |
| **L2 对齐** | 话题 → **我的待办**，怎么自动出现？ | **没有通道**：①-b 实测成员（含 teammate）拉不到人 ⇒ 只能靠人之间说话 |
| **L3 并发** | 同一文件多写者，**我怎么知道能不能写**？ | 无锁；靠口头约定 |

## L1 · 门的边界：三个方案

### A · 共享服务 + 共享会话库（现形态）
- ✓ 零新结构、一个服务、Agent Teams 消息通
- ✗ **各人看得到彼此的门**（用户明确说不对）；要找自己的门；preset 默认坑

### B · 共享盘 + **每人一个 `$DSH_HOME`**（各起各的服务）
- ✓ 侧栏**天然只有自己的门**；与"迁到真实多人"同形（RFC §迁移清单 就是这形态）；零 client 改动
- ✗ Agent Teams 消息**跨 home 不通**；要装多份 pack/home
- ⚠ 这条**在 RFC 里被否过**（"三份会话库 ⇒ 团队态互相看不见，与同一 topic 协作相反"）——
  但用户这次的反馈说明：**"互相看不见"正是想要的**，而"同一 topic 协作"由**共享盘**承载、
  不需要共享会话库。**⇒ 那条否决理由需要重审。**

### C · 共享服务 + **每人一个 symlink workspace**（指向同一个真盘）
```
dev/homes/alice/company-workspace -> ../../company-workspace   # 真盘
dev/homes/bob/company-workspace   -> ../../company-workspace
```
每人用**自己的那个路径**当会话 cwd。文件操作落同一个真盘（symlink 透明），但**侧栏按 cwd 分组**。

**实测（2026-09-26，决定性）**：用 symlink 路径建会话 ⇒ 它被归到
`--Users-bowhead-ai_dsh_company-dev-homes-bob-company-workspace--`——**按字面路径，未被解析成真盘**。
⇒ **各人只看到自己那组会话** ✓，且路径仍以 `company-workspace` 结尾 ⇒ `journal-audit:78` 的
`endsWith('company-workspace')` 过滤照样认 ✓。

- ✓ 一个服务、消息通、门天然隔离、**零 client 改动**
- ✗ **`scripts/deliverables-check.mjs:80` 会漏**：它按 `resolve` 后的路径算 bucket 名
  （`-${workspace.replaceAll('/','-')}--`），而会话实际落在 symlink 名的 bucket 里
  ⇒ 乙的门里那次 `present` 它看不见 ⇒ 假红 `final-not-presented`。**要改扫描面**（按后缀扫多个 bucket）。
- ⚠ 未实测：symlink cwd 下**写入是否被沙箱放行**（预期放行：相对路径解析后落在 symlink 前缀内）。

### D · **命名约定代偿**（零结构，不隔离只帮找）
每扇门把会话标题写成 `<角色> · <slug>`，侧栏可搜/可辨。
- ✓ 零结构、零改动、今天就能用
- ✗ **不解决"看得到别人的门"**（只是让它不那么刺眼）；靠人自觉命名

### E · **client 侧"我的门"过滤/收藏**（**红线，只留案**）
在驾驶舱里按角色 pin/过滤会话列表。
- ✓ 这才是真正好用的 UX
- ✗ **要动 client 数据层**（用户 2026-09-25 已裁 demo 期不做）⇒ **本轮不做，只登记**

**方案对照（含成本）**：

| | 门的隔离 | 消息通道 | 新结构 | 门禁改动 | 与真实多人同形 | 今天能做？ |
|---|---|---|---|---|---|---|
| A | ✗ | ✓ | 无 | 无 | ✗ | ✓ |
| B | ✓ | ✗ | 多 home | 要（扫多 home） | ✓✓ | ✓ |
| C | ✓ | ✓ | symlink 目录 | 要（扫多 bucket） | 半（一个服务） | ✓（已实测分组） |
| D | ✗（只帮找） | ✓ | 无 | 无 | ✗ | ✓ |
| E | ✓ | ✓ | client 改动 | — | ✗ | **✗ 红线** |

## L2 · 对齐：正解是**扫盘推待办**，不是找通道

**为什么不能靠"通知"**：①-b 实测——被委派的成员（含 team teammate）**拉不到人**，
问询在服务层被拒（`DELEGATED_CALLER`）。⇒ **跨门的通知通道在 DSH 里不存在**，
自建 = 发明（D13 禁）+ 要动 client/server（用户已否）。

**所以对齐只能靠"状态可推"**：把盘上的状态变成"我那扇门一打开就看得见的待办"。

**做法（零新机制）**：每扇门的**开工动作**（已有先例：读 CHARTER + journal + org.md）加一步——
扫 `deliverables/*/drafts/ceo.md`，找出「任务书里点了我这个角色、但我还没有 `drafts/<角色>.md`」
的那些 ⇒ 列成"待我处理"。
- 依据全在盘上：任务书（谁派活、点了谁）+ 目录内容（谁出了稿）⇒ **可推、可复核、无新事实家**
- 这也顺带解决了"自己新建会话对不上话"：**不用对上**——门自己会去找话题。

**其他方案（列出以证空间完整）**：
- **F · 显式派活单**：CEO 写 `deliverables/<slug>/ASSIGN.md`（谁 / 做什么 / 状态）。
  ✗ 比"扫盘推"多一个**新文件类型**（`drafts/<角色>.md` 已是既有形状，任务书用它就够）——
  多一个事实家就多一处会漂。**除非**评审认为"任务书兼派活单"在语义上太挤。
- **G · 靠 CEO 的动议会话 spawn 成员，人的门只读**：✗ 机制上成员**拉不到人**（①-b 实测）⇒
  人就成了旁观者，"各自开门"失去意义。
- **H · 上游 seam：按角色路由通知**（搁置池）：✓ 才是真解；✗ 需上游能力，**不自建**。
- **I · 驾驶舱"动议"页签**（按 slug 聚合各角色稿状态）：✓ **那才是真正的 UX**；
  ✗ 要动 client 数据层 = **红线，只留案**。

## L3 · 并发：**用产物形状把锁需求消掉**，而不是去实现锁

现在"一文件一写者"其实**已经由形状保证**：

| 文件 | 写者 | 冲突面 |
|---|---|---|
| `deliverables/<slug>/drafts/<角色>.md` | **只有本人** | 无 |
| `kb/<角色>/journal/` | **只有本人** | 无 |
| `deliverables/<slug>/final.md` | **只有 CEO** | 无（单人写） |
| `kb/motion-ledger.md` | 维护者 | 无 |
| `drafts/ceo.md`（任务书） | **只有 CEO** | 无 |

⇒ **真正的共享写者不存在**——锁要解决的问题被形状消掉了。剩下的只是**可见性**（谁在写、写到哪了），
而那可以退化成"看文件 mtime/内容"（够用），**不必造锁**。
- 兜底仍在：**写前读**（手册纪律）+ 事后门禁（三态判据抓"成品没有 present 背书"）
- ⚠ 唯一真风险：**同一个人开两扇门写同一个文件**（自己撞自己）——低危，靠"一门一角色"的纪律挡

**其他方案（列出以证空间完整）**：
- **J · append-only 活动流**（谁在写什么，如 `kb/<slug>/ACTIVITY.md`）：✓ 有可见性；
  ✗ 造新事实家 + 需要"什么时候写"的纪律，**收益不抵成本**（可见性看 mtime/内容已够）。
- **K · 文件级租约**（`.lock` sidecar）：✗ 造锁机制 = 发明（D13），且锁要解决的问题已被形状消掉。
- **L · 用 git 当并发层**（各人 commit/push，冲突显式化）：✓ 这才是多写者的"真答案"；
  ✗ demo 期给每个物理人加 git 仪式太重；**迁到真实多人时可作可选层**（合同 §5 迁移清单可挂）。

## 推荐（待用户裁）

1. **L2 先做**（立刻可做、零成本、收益最大）：手册/CHARTER 的开工动作加"扫动议台账推待办"。
   —— 它直接回答用户那句"怎么立刻对齐"。
2. **L1 在 C 与 B 之间选**：
   - 想**保留一个服务 + 团队消息** ⇒ **C**（symlink 门），代价 = 改 `deliverables-check` 的扫描面；
   - 想**与真实多人环境完全同形、且不在乎跨 home 消息** ⇒ **B**，代价 = 多 home + 门禁扫多 home。
   - 我倾向 **C 先试**（改动小、可逆、一个服务），把 B 留作"迁移形态"（RFC §迁移清单 已经就是它）。
3. **L3 不造锁**：把"一文件一写者"从**口头约定**升级为**形状声明**（写进合同），
   并明确"共享写者不存在"这个事实。
4. **preset 默认坑**：进 runbook（"开每扇门**必须改 preset**，默认是 `ceo`"）——
   已实测踩到，且**门禁查不出来**（查在场不查署名）。
5. **上游 seam（搁置池，不自建）**：让审批/问询能**按角色路由到别的会话**——那才是
   "谁该批的卡落到谁的门"的**真解**；现在只能靠"让那个人在自己的根会话里触线"。

## 输掉的方案（先记，免得重复讨论）

- **造通知/推送通道**：机制上不存在（成员拉不到人），自建要动 client/server（用户已否）。
- **给会话加"话题"字段 / 派生各角色的门**：派生出来的是**子会话**，而子会话拉不到人
  （`DELEGATED_CALLER`）⇒ 人的门**必须是根会话**，不能派生。
- **按角色藏内容**：同一话题一个真相是这家公司的卖点；藏内容 = 拆掉协作（RFC 已裁）。
- **造文件锁**：锁要解决的问题已被"一文件一写者"的形状消掉；造锁 = 发明（D13）。

## 依据

- 机制：①-b 探针（`scripts/member-inquiry-probe.mjs`）+ `vendor/dsh/packages/interaction/user-questions/src/index.ts:101-106` +
  `vendor/dsh/packages/subagent/subagent/src/child-agent.ts:254`；本提案的 symlink 分组实测 = 会话 bucket 名
  `--Users-...-dev-homes-bob-company-workspace--`（按字面路径）。
- 合同：[docs/multi-human.md](../../docs/multi-human.md)（§0 机制边界 / §2 开门 runbook / §3 交接协议）。
- 真盘实测那场：slug `sea-reconcile-2026`（見 §问题 的 preset 默认坑）。

## 可核清单（**每条结论都能被独立核实**——评审请优先打这里）

| # | 结论 | 怎么自己核 |
|---|---|---|
| 1 | **被委派的成员（含 team teammate）拉不到人**：问询在服务层被拒 | 跑 `source dev/env.sh && node scripts/member-inquiry-probe.mjs`（真模型 ≈$0.1，排练场）；源码 `vendor/dsh/packages/interaction/user-questions/src/index.ts:101-106`（抛 `DELEGATED_CALLER`） |
| 2 | 审批对成员**硬编码** `never` | `vendor/dsh/packages/subagent/subagent/src/child-agent.ts:254` |
| 3 | 判"是不是 root"的字段是 `parent`（**运行时归属**） | `vendor/dsh/packages/core/agent/src/index.ts:66`（注释原文 "Live parent Agent for runtime ownership; **omit for a root Agent**"）+ `:596` `roots()` 实现（`filter(entry => entry.owner === undefined)`） |
| 4 | team teammate 是 `parent: root` 建的 ⇒ **也不是 root** | `vendor/dsh/packages/experimental/agent-team/src/roster.ts:288`（`request: { prompt, parent: root }`） |
| 5 | **侧栏按 `cwd` 字面分组**（symlink 能隔离） | 建 `dev/homes/bob/company-workspace -> 真盘`，用该路径 `session/create`，看 `$DSH_HOME/sessions/` 新 bucket 名 = `--Users-…-dev-homes-bob-company-workspace--`（**未被解析成真盘**） |
| 6 | `deliverables-check` 按 **resolve 后**的路径算 bucket ⇒ symlink 门会漏 | `scripts/deliverables-check.mjs:80`（`-${workspace.replaceAll('/','-')}--`，`workspace` 来自 `resolve`） |
| 7 | `journal-audit` 认 `endsWith('company-workspace')` ⇒ symlink 门照样认 | `scripts/journal-audit.mjs:78` |
| 8 | 卡按**"发起它的那个 agent 的会话"**作用域 | RFC §机制核实（两门实测 A=true / B=false）；落点 `docs/multi-human.md` §0 |
| 9 | **新建会话 preset 默认 = `ceo`**（第二扇门极易开错） | `docs/demo.md` §前置 第 4 步；真盘实证：会话 `0e7ead3b`（preset `ceo`）写了 `kb/cfo/journal/…` |
| 10 | **`journal-audit` 查在场、不查署名** | 同上：CFO 的 journal 由 ceo 会话写，审计仍判 ✅ |

**仓库自带的探索路径**（评审不必从零摸）：
- 入口链：`AGENTS.md` → `docs/index.md`（地图 + **§术语映射**：概念→源码直达表）→
  `docs/guides/dev-loop.md` §0.5/§1（任务入口与执行规则）；
- **vendor 只读铁律**：`vendor/dsh/` 是钉住 SHA 的 submodule（`dsh-v0.1.7-rc.2` =
  `477b4f420553e8a52c2fbccc464d7561b239c443`），**一个字节都不许改**（`pnpm verify` 双门禁强制）；
  上面所有以 vendor 树开头的行号都指它；
- 跑起来：`source dev/env.sh`（双 home 兜底）→ `pnpm verify`（结构门禁，秒级）→ `pnpm test`
  （keyless 回归，210 项）；真模型档按 §9.1 分层按面选跑；
- **起一个真会话看机制**：`CI=true pnpm dsh web -- --port 0 --no-open`（端口是环境状态；启动横幅
  打印带 token 的 URL）；RPC 形态见任意 `scripts/*-probe.mjs`（`session/create` → `session/prompt`
  → `session/page` 读事件）；
- 本仓特有的两条：**「一处事实一个家」**（D10，别把同一事实写两处）与 **「完成定义 = 该面最小真检查
  通过」**——所以本提案里凡有断言，都尽量给"一条能跑的命令"或"一行能读的源码"。

## 我不知道的（**请评审优先攻这里**）

1. **L2 的最大弱点**：任务书 `drafts/ceo.md` 里"点了谁"是**自然语言**（例："分派 CFO 出经济性、
   COO 出承接"），**不是结构化字段** ⇒ "扫盘推待办"要读自然语言，**可能漏、可能误**。
   缓解候选：约定任务书里有一行固定形状（如 `派活：CFO / COO`）——但那等于给任务书加字段。
   **这是我方案里最脆的一环，请重点打。**
2. **symlink cwd 下写入是否被沙箱放行**——未实测（预期放行：相对路径解析后落在 symlink 前缀内）。
3. **侧栏分组的确切实现**——我是从会话 bucket 名**反推**的，**没读 client 侧渲染逻辑**。
   若 client 实际按 realpath 分组，则方案 C 失效。
4. **方案 B 下 Agent Teams 消息是否真的跨 home 不通**——未实测，是从"会话库/凭据按 home 隔离"推断的。
5. **多人同时写同一文件的实际后果**——未实测；当前靠"一文件一写者"的形状规避，没验证过违反时的行为。
6. **"刷新即丢"对 L2 的影响**：卡是实时事件、刷新不重建（已知边界）⇒ 若 L2 也依赖实时事件就会失效；
   我的设计**刻意只用盘上状态**（不依赖事件），但没实测"人离台再回来"的完整体验。

## 什么会推翻我（先说清判据，免得争论无锚）

| 若观察到 | 则 |
|---|---|
| client 实际按 **realpath** 分组会话 | **L1-C 失效**（symlink 隔离不成立），退回 B 或 D |
| Agent Teams 消息**能**跨 `$DSH_HOME` | **B 的主要缺点消失**，B 优于 C（更贴真实多人形态） |
| "扫盘推待办"的漏/误率高到不可用 | **L2 改用显式派活单**（方案 F），接受多一个文件类型 |
| 真出现**两个物理人写同一文件** | **L3 的"形状消掉锁"不成立** ⇒ 上 git 当并发层（方案 L） |
| 上游补了"按角色路由"的 seam | **L2/L3 大部分可退役**——通知能到各自的门，"扫盘推"降为兜底 |

## 我建议的评审问题（给评审者）

1. **L1**：除了 A–E，还有别的形态吗？"每人一个 symlink 门"这种**借平台分组语义**的做法，
   有没有你见过的更干净的等价物？
2. **L2**：**"对齐"这件事，在"没有通知通道"的前提下，除了"状态可推"，还有第三种范式吗？**
   （这是我认为最值得被挑战的一条）
3. **L3**：我主张"用产物形状消掉锁需求"。**这个主张在什么条件下会崩？**
4. 整体：**这三层拆得对吗？** 有没有被我漏掉的第四层（比如"话题的生命周期/归档"）？
