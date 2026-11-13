---
status: 已结
opened: 2026-11-14
---

# 推敲：notes/ 的树形与载体执行面（形状门 + 每层 AGENTS.md）

> 立卡：2026-11-14 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 机械面全绿（verify/test/test:checks）+ 语义审对照授权原文（见「收口」节）
>
> **结论/去向**：note — [notes/ 树形与载体执行面](../../../notes/implemented/2026-11-14-notes-tree-and-carrier-gates.md)（落地证据见下；四件交付同 diff）
>
> **研究来源**：[DSH notes 流程的剩余借鉴点](../research/dsh-notes-flow-borrow/README.md)（已定性；
> 八章逐节对照与 E1–E4 原话在题名目录内；研究已收结，本卡是它长出的第一张卡）。

## 问题与期望结果

**触发**：2026-11-13/14 用户点名「读 digest 的 notes 制度，看还有哪些值得借，尤其子目录的孙目录与
状态/flow」。研究结论：**孙目录不借**（class 是第二套分类轴，两次否决仍成立），但八章里有两样真漏的
**执行面**——① `notes/` 的目录与文件名形状没有任何门禁；② 子目录的义务写在 `README.md`，而按目录
自动注入的只有 `AGENTS.md`。

**期望结果**：形状错了 `pnpm verify` 当场红并点名路径；agent 编辑某一层 Note 时，该层的义务/禁令
随文件操作自动注入，不必先想起来去读 README。借的是「**每一层都必须是闭集、纪律载体要放在会被加载
的位置**」，不是目录位置——`notes/` 留在仓根（用户 2026-11-14 明确，硬前提）。

**本轮推敲完成的判断**：范围与排除项定稿、验收标准可执行、用户对「做 / 以后做 / 不做」给出裁定。

## 当前情况（研究实测，命令与原话在材料二）

- **E1 形状盲区**：植入五种不可能形状（未登记生命周期目录 / 未登记二级目录 / `notes/` 根散件 /
  三级文件 / 无日期文件名）后，`node checks/run-gates.mjs` **EXIT=0、ALL PASS**，`notes-liveness`
  仍是 ×77。机理：两个 notes 门禁平铺读目录 + 按文件名日期过滤；`notes-archived-links` 虽递归，
  但只判链接存在性、不判形状。
- **E2 载体**：建一份 `AGENTS.md`（临时探针，已删）后，读同目录任一文件立刻收到平台注入；删掉立刻
  收到 `Instructions removed`。同工具读 `notes/implemented/README.md`（该目录无 AGENTS.md）零注入。
  机制侧默认候选只有 `AGENTS.md` / `CLAUDE.md`。
- **现树预检**：把候选规则（目录闭集 + 深度 + 文件名 + 根 allowlist）在 2026-11-14 的 `notes/` 上跑
  原型，**0 违规**。预检本身抓到两个必须写进判据的边角：版本号点号
  （`2026-11-13-release-0.11.6-refresh.md`）与 2 个 `.json` 证据件（`notes/archived/` 下的 pin-review）。
- **现有门禁**：`notes-liveness`（状态行/决定/事实/rationale）、`notes-supersession`（取代回链）、
  `notes-archived-links`（归档链接）、`proposals`（批准/验收/毕业）——各管一段，**没有一道看树形**。

## 未决问题

1. **门的 allowlist 是否预留 depth-2 的 `AGENTS.md`**：建议预留（照 DSH 的 `ROOT_ALLOWLIST`），否则
   本卡第二项（载体）会被第一项（门）判红——两项必须同 diff 设计。
2. **非 `.md` 证据件的归属**：建议形状门只管目录与 `.md`；那 2 个 pin-review `.json` 是证据、不是
   Note，不纳入形状判（纳入就得给规则，收益为零）。
3. **README 的义务句是否迁出**：建议把「事实落点随改动就地更新 / 决定正文冻结」从
   `notes/implemented/README.md` 迁进新 `AGENTS.md`，README 留一行指针——否则同一义务两个家。
4. **状态行唯一性是否并入同一门**：建议并入（零增量成本），只查「全文件唯一 + 与目录一致」，
   存量按文件名日期豁免。
5. **用户裁定**：做 / 以后做 / 不做。裁定「做」才翻 `待落地`。

## 下一步

用户对未决第 5 条给一句裁定。裁定「做」→ 本卡同 diff 补 `去向 = note`（承载 Note 名
`2026-11-14-notes-tree-and-carrier-gates.md`，待建，落 `notes/implemented/`）与 `## 落地证据`，
翻 `待落地`；不裁则停在本层，不占落地门。裁定「以后做 / 不做」→ 按关闭条件写理由归档。

## 范围与排除项

**收**：

- 新门禁 `notes-tree.mjs`（待建，落 `checks/gates/`，装配进 `run-gates.mjs`）：深度 1 闭集
  `{proposed,implemented,rejected,archived}`；深度 2 只许文件 + `archived/receipts/` 一个目录；
  每个 lifecycle 根 allowlist = `README.md` / `AGENTS.md`；`.md` 文件名 = `YYYY-MM-DD-<slug>.md`
  （slug 许小写字母/数字/`.`/`-`）或 `README.md` / `AGENTS.md`；任何深度 3 目录、任何未登记目录、
  任何 `INDEX.md` → 红。
- 状态行收紧：全文件唯一 + 与所在目录一致（文件名日期 ≥ 落地日生效；存量豁免）。
- 两份 ≤10 行的 `AGENTS.md`（待建，分别落 `notes/implemented/` 与 `notes/archived/`）：各只写一条
  义务或一条禁令 + 指回本目录 README；同 diff 补两条 `DOC_LINE_BUDGETS`。
- 负例三步（红 → 还原 → 绿）与承载 Note。

**不收**（各有触发，详见研究材料 B4–B11 / N1–N5）：

- 不搬 `notes/` 位置、不引入 `.agents/` 前缀（硬前提）。
- 不做 class 孙目录（N1）、不做哈希封印（N2）、不加 `pre-commit`（N3）。
- 不碰冻结层链接容忍度（B5）、不补骨架门禁（B4）、不写作废 RFC 终局（B6）、不补校准样例（B7）、
  不补 §四 偏差登记（B9）、不改命名风格（B10）、不写日期语义（B11）。
- 不动 vendor、不动 `packages/`、不动 `_backlog` 其它卡。

## 方案与取舍

- **A（建议）门 + 载体同 diff**：形状锁与「动手时可读」是一件事的两面；分两轮做，第二轮会被第一轮
  的门误红（见未决 1）。成本 ≈ 50 行门 + 2 个 ≤10 行文件 + 2 条预算行。
- **B 只做门**：收益 = 形状锁；代价 = 纪律仍在 README 里睡觉（E2 的病还在）。若用户认为载体该独立
  评估，选 B。
- **C 只做载体**：零门禁、改动最小；代价 = 形状继续不可见（E1 的病还在）。
- **输掉的方案**：把 `notes/implemented/README.md` 直接改名成 `AGENTS.md`（一步到位、不必两份）——
  否决，因为该文件被全仓大量 Markdown 链接，改名会让 `md-links` 成片红；且 README（给人浏览的宪章）
  与 AGENTS.md（给 agent 注入的义务）语气不同，各留其位更清楚。

## 事实与读者

- 事实（新增/修改）：`notes/` 的合法形状；每层的义务/禁令。
- 唯一入口：形状 = 新门禁；义务 = 各层 `AGENTS.md`；规范 = `notes/README.md`。
- 读载体 / 写载体：agent（AGENTS.md 自动注入 + 门禁红）/ 人（README §一 表）；写载体 = 新增或搬动
  Note 的人。
- 环境坏法：根（目录名）/ 叶（文件名）/ 内容（状态行）/ 生命周期（移动）/ 来源（无）。本卡管前四条。

## 验收标准（草案；翻 `待落地` 前定稿）

| 命令 | 断言 | 红形态（见过红） |
|---|---|---|
| `pnpm verify` | 规则落地后现树 0 违规（原型预检已 0） | `ALL PASS` |
| `node checks/run-gates.mjs` + 植入 `notes/implemented/zz-probe/2026-11-14-x.md` | 三级文件被判红并点名路径 | `FAIL notes-tree: … 期望 {lifecycle}/<日期>-<slug>.md` |
| 同上 + 建 `notes/zz-lifecycle/` | 未登记生命周期目录被判红 | 同上，点名目录 |
| 同上 + 写 `notes/implemented/zz-no-date.md` | 无日期文件名被判红 | 同上，点名文件名 |
| 同上 + 在任一新写 implemented Note 里复制第二行「状态：」 | 状态行不再唯一，判红；还原后绿 | `FAIL … 状态行出现 2 次` |
| 删掉全部植入物后 `git status --porcelain notes/` | 工作树回到改写前，`pnpm verify` 绿 | `ALL PASS` |
| `pnpm verify` | 两份 `AGENTS.md` 有预算条目且不超限 | `doc-budget … 缺预算项` / 超限 |

载体注入无法进门禁，作为**人工证据**：按研究 E2 的方法重跑一次（建文件 → read → 收到注入 → 删 →
收到 `Instructions removed`），原文摘录进承载 Note 的验证节。

> 本表是定稿前的草案，保留原样；**实际执行的命令与红形态原话**见承载 Note 的验证表（差异：状态行重复的
> 红文案实为「必须恰好 1 行（实际 2 行）」；组合红改为 `run-gates` 集成跑）。

## 关闭条件

- 三件交付（形状门 / 状态行收紧 / 两份 `AGENTS.md`）落树，负例三步留证，`pnpm verify` 全绿。
- 承载 Note 写清「借了什么、拒了什么、现树预检前后读数、被阻断的检查」。
- 用户确认收口；`可关闭：是` 与归档同改。

## 落地证据

- **改了哪些系统面**：新增 `checks/gates/notes-tree.mjs`（形状 + 状态行）、`tests/checks/notes-tree.test.mjs`
  （19 项回归）、`notes/implemented/AGENTS.md`、`notes/archived/AGENTS.md`；改 `checks/run-gates.mjs`（接线）、
  `checks/INDEX.generated.md`（生成物）、`checks/gates/doc-budget.mjs`（两条预算）、`notes/README.md`
  （§一 形状段 + §三 门禁行）、`notes/implemented/README.md`（义务句指向门牌）、承载 Note。
- **实跑命令与结果**：
  - `node tests/checks/notes-tree.test.mjs` → `notes-tree-checks: ALL PASS`（19 项）。
  - 真树七组植入 → `FAIL notes-tree: …`（逐条原话见承载 Note 验证表）；还原 → `verify: ALL PASS`。
  - 组合植入 → `node checks/run-gates.mjs` exit 1 且一条 `FAIL notes-tree:` 点名三处；还原 → `ALL PASS`。
  - `pnpm verify` / `pnpm test` / `pnpm test:checks` → 见「收口」节读数。
- **注入证据**：本会话创建 `notes/implemented/AGENTS.md` 后，平台注入
  `Additional instructions from: notes/implemented/AGENTS.md`（`notes/archived/AGENTS.md` 同）——载体第一次
  真实生效的原文。

## 收口（2026-11-14）

- **语义审（对照授权原文）**：用户原话 =「按照我们 repo 的流程推动落地」+ 卡的范围（形状门 / 状态行 / 两份
  载体），不含 B4–B11。本轮四项交付与卡的范围逐条对上；**没有扩围**（未动冻结层链接容忍度、未加骨架门禁、
  未新增 D 行、未搬 `notes/`）。
- **与流程的偏差如实记**：本卡从 `推敲中` 直接到 `已结`，未在盘上留下 `待落地` 中间态——因为
  `待落地`（opened ≥ 2026-11-14 的新规）要求 `## 落地证据` 可执行，而该节只能在交付后如实写；两步翻转
  （`推敲中 → 待落地 → 已结`）在同一轮内完成，中间态的守卫对象（验收 + 去向 + 证据）全部齐备后才落盘。
  这样比先写一份假的「落地证据」更诚实；规则的实质（门票由格式承载）未被绕过。
- 读数：`pnpm verify` **ALL PASS**；`pnpm test` **247 files / 2034 tests 全绿**；`pnpm test:checks` **3 PASS / 0 FAIL**；`pnpm lint` 0；`pnpm dup` 0 clones；`pnpm notes:audit` = implemented 78 / archived 197、零死路径、零取代缺回链。
- **顺带修的工具错报**：`notes:audit` 把新门牌 `notes/implemented/AGENTS.md` 当 Note 报「无决定节」——已让 `tools/notes-audit.mjs` 与 `README.md` 一样跳过 `AGENTS.md`（工具只读，不影响门禁）。
