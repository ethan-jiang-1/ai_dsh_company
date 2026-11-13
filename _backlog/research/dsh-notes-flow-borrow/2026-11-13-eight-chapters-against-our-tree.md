---
topic: dsh-notes-flow-borrow
intent: 把 digest 八章逐节对到本仓 notes 层，给出「已对齐 / 借了形状没借执行面 / 明确不借 / 未登记偏差」四档判定，每条附证据行号与可证伪。
---

# 八章逐节对照：DSH 的 notes 制度 → 本仓落点

## 证据口径

- **digest** = 外部研究树 `_digested/development-flow/`（维护者本机，repo 外只读；八篇 `00`–`08`）。
  本材料只引用它的判断，不复述它的证据。
- **权威** = 钉住 tag 的 [vendor/dsh/.agents/notes/README.md](../../../vendor/dsh/.agents/notes/README.md)
  （125 行）+ [scripts/agent-note-tree.ts](../../../vendor/dsh/scripts/agent-note-tree.ts) +
  [scripts/verify-agent-note-format.ts](../../../vendor/dsh/scripts/verify-agent-note-format.ts)；
  digest 与本仓 pin 同基线（`AGENTS.md` §vendor 簿记）。digest 的 `[原文]` 可逐字 grep，`[推断]` 在本材料
  一律降级为「待验」，不当事实。
- **本仓落点**只点具名文件；行号以 2026-11-13 工作树为准，日期化引用（易腐，不写进合同文档）。
- 每条判定末尾的「可证伪」= 哪份文件改掉后这句话变假——照 digest `06` 的格式。

## 一张总表

| 章 | DSH 机制（一句） | 本仓落点 | 判定 |
|---|---|---|---|
| `01` 生命周期 | 路径 = 状态；`{lifecycle}/{class}/` 两个闭集轴，深度钉死 3，禁 `INDEX.md` | [notes/README.md](../../../notes/README.md) §一 四目录表 | 生命轴**已对齐**；class 轴**明确不借**（§四 ③）；深度**没上锁**（E1） |
| `02` 门禁 | classification / format / archived 三道 leaf 门禁，各管一段 | `notes-liveness` / `proposals` / `notes-archived-links` + `md-links` / `bare-path` | **借了形状**；缺三样：树形、状态行唯一性与目录一致、备选强制 |
| `03` 转换 | `proposed→rejected` 最便宜；`proposed→implemented` 改写整篇；改写只有一半有门禁 | RFC 毕业（`proposal-graduated`）+ 同 diff 改写散文 | 改写**借了**（同样只机械化了一半）；**拒绝这条边没借** |
| `04` 忘记 | 四分法 + 校准样例（字数与判定方向相反）+ 哈希封印 | §五 五分处置 + `archived/receipts/` + `pnpm notes:audit` | 判据**借了**；校准样例**没借**；封印**明确不借**（登记「seal manifest」） |
| `05` 回写 | 学习落成五形态；存在性与质量**都没有**门禁 | note / docs / skill / 常驻 AGENTS / 门禁五形态齐；§三 写升级触发 | **已对齐**，且「无存在性门禁」是共同设计而非疏漏 |
| `06` 诚实缺口 | 每条缺口配一个能推翻它的观察 | `testing.md` §3.7 prove-it-red、close-out、本材料 | **方法已内化**（本材料照做） |
| `07` 命名与家务 | 动词命名、一词一义、日期 = 首次提出、章节闭集、链接代替叙述 | §一 命名 + §二 必载节 + `md-links` | 章节与链接**已对齐**；动词命名**未借**（可选）；日期语义**未写死**（未登记偏差） |
| `08` 执法者 | 六类执法者分时机；冻结层进 `pre-commit`；三份命令文件；六份 skill 分段 | `checks/gates/` 装配 → `pre-push`；两份 skill；`docs/AGENTS.md` 管辖权对偶 | 形状**对齐**；「三份命令文件」只借了根（B2）；排除规则与容忍度**分散**（B5） |

一句话读法：**八章的主轴在本仓都找得到对应物；差的不是第九个维度，是执行面。** 三处执行面缺口
（树形锁、载体锁、判据校准）与一处两门打架，见材料二。

## 逐节：判定不显然的地方

### `01` 孙目录：不是「不能加」，是「加了就得养一套闭集」

DSH 的 class 轴之所以成立，靠三件事同时在场：闭集 6 个名字写死在
[agent-note-tree.ts:20](../../../vendor/dsh/scripts/agent-note-tree.ts)、README 有一张
classification 表（[README.md:21-34](../../../vendor/dsh/.agents/notes/README.md)）、门禁对任何
不在集合里的目录名直接报错（`:72`）。digest 自己承认这是**放弃第四层换来的**：「分类只有一套、且有
校验收口」，代价是 `implemented/architecture` 到 180 篇时 browse 已死。

本仓的账：`implemented/` 77 篇、`archived/` 197 篇（2026-11-13 实测，见 E4）。**77 还没到 browse
失效的量级；197 早已过了，但那一层按定义只 grep 不 browse**（[notes/README.md:17](../../../notes/README.md)：
archived 是冻结层、不是当前 rationale owner）。所以在 77 这个数上引入 class 轴，等于用一套要人同步的闭集去换一个
还不存在的痛——而 DSH 自己的缺口清单写着：class 表与源码是**两份字面副本**，加一个 class 门禁不会红
（digest `06` 缺口一）。我们连那份副本都还没有。

两条否决记录仍然成立，且都被登记过：
[2026-10-05-notes-taxonomy-owner](../../../notes/archived/2026-10-05-notes-taxonomy-owner.md)
「生命周期轴已够用，class 正交」、
[notes/README.md:92-93](../../../notes/README.md) §四 ③「不借 `{lifecycle}/{class}/` 两级路径」。

**可证伪**：若 `implemented/` 越过约 120–150 篇、且实测「按主题 grep 一遍仍找不到」成为常态，
这条判定应重开——那时正确的动作是重新称量 class 轴，不是先加索引（`INDEX.md` 禁令与 D34 同源）。

### `01` 真正的教训是「每一层都必须是闭集」，而我们两层都没上锁

digest 给三条 `structure:` 报错的理由是同一句：不认识的目录会让里面的 note
「invisible to the walk below」。**这句在本仓可以逐字复现**：见材料二 E1——未登记目录（两种）、
`implemented/` 下的子目录、无日期文件名，四种形状下 `pnpm verify` 全绿，因为
`notes-liveness` / `notes-supersession` 平铺读目录 + 按文件名日期过滤
（[notes-liveness.mjs:31-46](../../../checks/gates/notes-liveness.mjs)），过滤掉的东西没有任何人补一句；
`notes-archived-links` 虽然递归，但只查链接、不查形状。

推论：**问题不是「我们只有两层」，是「两层的合法形状没人守」。** 第二层我们其实已经有孙目录了
（`archived/receipts/`），它今天是单例、靠 README 说明（[receipts/README](../../../notes/archived/receipts/README.md)），
门禁只知道它存在（`notes-archived-links` 递归走）。这是**开放集**——DSH 的整套结构就是为了消灭
开放集：深度用等号判、目录名用闭集判。所以正确答案是给现有两层上锁（B1），而不是加第三层。

### `02` 三道门禁对得上的部分，与对不上的三样

对得上的：状态行按生命周期分档（我们是「状态：」词表 + 日期分档，见
[notes-liveness.mjs:38](../../../checks/gates/notes-liveness.mjs)）、`proposed/` 侧两道硬门禁
（批准标记 + `## 验收`，[proposals.mjs](../../../checks/gates/proposals.mjs)）、档案层的链接兜底
（`notes-archived-links`）、事实落点时效（D38 分档）。

对不上的三样，逐条都有本仓的「为什么没做」可查，但**都不是刻意不借**，是那一轮没轮到：

1. **树形门禁**（DSH 的 classification）——本仓完全没有。见上节与 E1。
2. **状态行的唯一性与目录一致性**——DSH 要求 `Status:` 全文件唯一（`verify-agent-note-format.ts`），
   且值必须与父目录一致。本仓只查「前 6 行有以生命周期词开头的状态行」，**不查唯一、不查 archived 侧**。
   今天没有漂移（`notes:audit` 的 `statusMismatch` = 空，E4），但那是人守的。
3. **备选强制**——DSH 用 `## Alternatives considered` + 一个带期限的豁免注释。本仓把它写成
   「输掉的方案必载」（[notes/README.md:52](../../../notes/README.md)）+ skill 的完成判据
   （[agent-note-definition](../../../.agents/skills/agent-note-definition/SKILL.md)），**没有门禁**。
   实测合规 77/77 篇（E4）——说明这条靠散文也守得住；但守得住不等于有人守。

### `03` 拒绝那条边：我们没有，而且不该照搬形状

DSH 的 `proposed→rejected` 只加一句理由、正文冻结，设计意图是「**拒绝要便宜**」，否则提案区会
腐化成死案堆。本仓的 `proposed/` 语义不同：只收**已批** RFC（D32），未批准的思考住
`_backlog/issues/`。所以那条边在本仓没有对应物——但**「已批 RFC 后来不做了」这件事仍然会发生，
而且今天没有落点**：`proposal-graduated` 只认「已消化 / 已交付 / 部分交付」三个词
（[proposals.mjs](../../../checks/gates/proposals.mjs)），一份被放弃的 RFC 既不会毕业、也不会红，
会一直躺在 `proposed/` 里。

本仓其实已经有一个更便宜、更原生的拒绝载体——**卡片**：`_backlog` 的 `不做 / 叫停` 是带理由的
终态，且要用户点头（[_backlog/README.md](../../README.md) 关闭条件表）。缺的不是机制，是
**两句登记**：作废的已批 RFC 往哪走（删？移 `rejected/`？）、卡与 RFC 谁承载理由。

### `04` 忘记：判据借了，校准没借

本仓 §五 的五分处置表（[notes/README.md:114-126](../../../notes/README.md)）与 DSH 的四分法同源：
判据按剩余价值、明文拒「按年龄」。但 digest 说得最重的一条我们没借：**校准样例**——给出成对的反例，
并特意让字数与判定方向相互矛盾，以此证明体积不是标准。本仓只有一句「剩余否决仍能阻止重开」，
五个字的判据，不同的人给出不同答案，且**没有一个人能拿它复算上一次归档**。

同时，DSH 的 keep 清单是六条（alternatives / ownership boundary / negative guarantee /
durable-or-wire / security rule / reintroduction condition），我们只有「否决」一条。这解释了
为什么本仓的处置讨论经常要重新吵一遍「这篇还有用吗」。

封印（`manifest.json` + 哈希 + 具名例外）明确不借，理由已登记（§四「seal manifest」），今天仍然
成立：本仓是单维护者 + git 即封印。**但要注意 digest 的反直觉结论**：冻结层越硬，活跃区越敢删。
我们没有硬封印，所以删除门槛抬到了「需用户点头」——这是同一个取舍的另一侧，不是疏漏。

### `07` 命名：章节闭集借了，动词命名与日期语义没借

章节闭集：本仓有一张更小的表（决定 / 输掉的方案 / 状态事实与载体 / 未覆盖轴 / 验证），写在
[notes/AGENTS.md:16-19](../../../notes/AGENTS.md)；DSH 的对照表在
[README.md:78-121](../../../vendor/dsh/.agents/notes/README.md)。两边的精神一致：**同一章节名
不跨生命周期复用**（DSH 禁 `## Acceptance criteria` 进 implemented；本仓的「状态事实与载体」
只属于决定类）。

没借的两条：

- **动词命名**。DSH 的文件名是一个行为（`fold-…` / `prune-…` / `X-over-Y`），好处是 grep 结果
  自解释。本仓多为主题名词（`2026-10-30-converge-evidence-home`、`2026-11-13-test-asset-fence`）。
  这条**零门禁、零成本，但也零强制**；要不要改是口味题，且只能前向（存量改名会断链）。
- **日期语义**。DSH 写死「文件名日期 = 主题首次被提出（按 git 历史）」，并推论「归档不改名」。
  本仓只有「时间轴 = 文件名日期 + git log（D34）」，**没写日期指什么**。今天事实上就是首写日
  （归档走 `git mv`，名字不动），但没人写下来——这正是下一次「归档时顺手改名」的来源。

### `08` 载体：三份命令文件，只借了一份半

DSH 的纪律分三份，各有语气：`notes/README.md`（规范，125 行）、`implemented/AGENTS.md`
（义务，13 行）、`archived/AGENTS.md`（禁令，9 行）。后两份之所以能这么小，是因为它们**分别只回答
子目录的那一个问题**。

本仓对得上的是「规范 + 门牌」：`notes/README.md`（126 行）+ `notes/AGENTS.md`（24 行）。**子目录
那一层是 `README.md`**（`proposed/`、`implemented/`、`archived/`、`rejected/`、`receipts/` 各一份
宪章）。问题在于：**`README.md` 不会被按目录自动加载，`AGENTS.md` 会**——本轮实测见材料二 E2。
也就是说，agent 编辑一篇 implemented Note 时，读得到 `notes/AGENTS.md`（父目录），读不到
`notes/implemented/README.md`（本目录）。DSH 的 `implemented/AGENTS.md` 恰好在那个位置。

这是**载体锁**：纪律写得再好，只要放错文件类型，它在「动手那一刻」就是不存在。

### 执法者与排除规则：形状对齐，容忍度分裂

本仓的门禁全部走 `pnpm verify` → pre-push（[.githooks/pre-push](../../../.githooks/pre-push)），
没有 `pre-commit`；这与 DSH 不同，但本仓的成本账是明写在 hook 头注里的（「hook 只装便宜高置信
缺陷」），且 pre-push 跑的是全量。**这条差异不构成缺口**，只需登记触发（提交后才发现问题的次数）。

真正的问题是「同一层、两种容忍度」：

- `notes-archived-links`：`archived/**` 的 `.md` 链接**必须全部在场**（[gate:39](../../../checks/gates/notes-archived-links.mjs)；
  只跳过 runtime/company-workspace/snapshots 三棵证据树）。
- `link-debt`：冻结层死链**只设天花板**，现基线 `archived 4 / moved 0 / live 0`
  （[link-debt.json](../../../checks/gates/lib/link-debt.json)），且实测那 4 条就是 `notes/archived/` 里指向
  已删文件的**非 `.md`** 链接。

同一层，`.md` 链接零容忍、非 `.md` 链接容忍到 4。这不是设计，是两道门先后落地时各自划了边界。
后果见 B5：下次 `docs/` 重构或 `implemented→archived` 移动会同时撞上 106 条 docs 与 22 条
implemented 的**活着的**归档出站链接（E3；22 条由 18 篇 note 发出，指向 11 个不同目标），
而修复它们只能编辑冻结文件。

## 本仓的形态差异（不算偏差，DSH 本来就没这些东西）

> **硬前提（用户 2026-11-13，两次确认）：位置不动。** `notes/` 留在仓根；digest 里的 `.agents/notes/`
> 只是**权威原文的地址**，不是要迁过去的目标布局。本材料与材料二的每一条候选都**在现位置实施**，
> 借的是判据与执行面（锁什么、判什么、谁自动加载），不是目录位置。任何把 `notes/` 搬进
> `.agents/`、或为对齐借源而重排仓根的提案，都不属于本轮范围。

- **位置**：`notes/` 在仓根，不在 `.agents/` 下。这不影响任何一条判定——所有门禁都以 `notes/` 为根，
  路径字面量集中在各门禁的头注里；B1 的树形判据同样只认 `notes/` 为根，不引入 `.agents/` 前缀。
- **中文单语**：没有 `.zh.md` 与 `.i18n.yaml` 三件套，因此没有 `translation-pairing`，也就没有
  「归档必须三件套齐全」这条硬门禁。这是形态差，不是纪律差。
- **两条根文件**（`README.md` + `AGENTS.md`）vs DSH 的每条 lifecycle 一份 `AGENTS.md`——见 B2。
- **`archived/receipts/`**：DSH 没有收据层。本仓加这一层是因为「收据 vs 决定」的分流在 2026-10-30
  真实发生过（66 条断链那轮）。**这是本仓比借源更细的一处**，不是偏差。
- **`rejected/` 语义不同**：DSH = 被否提案快照；本仓 = 结论错的研究稿。
  [rejected/README](../../../notes/rejected/README.md) 已写清，且今天为空目录（0 篇）。

## 偏差登记：§四 列了五条，实际有十条

[notes/README.md:82-93](../../../notes/README.md) §四 是借源账本（借 / 适配 / 偏离）。对着 digest
逐条数，**五条已登记**（① postmortem 不独立、② 不借「日期==状态行日期」门禁、③ 不借 class 路径、
④ 不设计数清单、⑤ proposed 语义收窄），**五条未登记**：

| 未登记偏差 | 现状 | 为什么该登记 |
|---|---|---|
| 状态行载日期与授权原话 | `状态：已交付（2026-10-07；批准：…）` | DSH 明文禁止（「carries no dates and no parentheticals」）；本仓是为授权链保留的（D34），属**有意偏离**，不写下来会被当成不合规 |
| 无双语三件套 / 无 pairing 门禁 | 中文单语 | 连带少了「归档三件套齐全」这条硬门禁，是结构后果 |
| `archived/receipts/` 第二层 | 单例、开放集 | DSH 无第二层；这一层今天没有形状门禁（B1 会顺带把它变成闭集） |
| `rejected/` 语义 | 研究稿 ≠ 提案快照 | 读者按 DSH 的印象会找错东西 |
| 文件名日期 = 首写日（未写死） | 事实如此、无人写 | 下一次「归档顺手改名」就会破 |

**可证伪**：若 `notes/README.md` §四 出现这五行的任一条，本表对应行作废。

## 边界

- 本材料只判「借不借」，不给实施形状——实施形状、成本与验收提示在材料二。
- digest 其余专题（`harness-idea/`、`test-strategy/` 等）不在本轮范围；其判断若被引用，按
  「外部判断」标注，不升格为事实。
- 数量只用于本轮的规模判断（78 / 197 / 32 / 3 / 0），日期化引用；本仓数量不进合同文档。
