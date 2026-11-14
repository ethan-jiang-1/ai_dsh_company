# notes/ 树形与载体执行面：形状门 + 每层 AGENTS.md

状态：implemented（2026-11-14；批准：用户 2026-11-14「严格按照我们 repo 的流程准备推动落地」；上游 = [卡](../../_backlog/_archive/settled_issues/2026-11-14-notes-tree-and-carrier-gates.md)；研究 = [dsh-notes-flow-borrow](../../_backlog/_archive/research/dsh-notes-flow-borrow/README.md)）

## 决定

`notes/` 的两条纪律此前只有散文：**合法形状**只写在 [notes/README](README.md) §一 的表里，**每层义务**只写在
各层 `README.md` 里。2026-11-14 研究实测了两件事：前者没有门禁（五种不可能形状下 `pnpm verify` 全绿），后者
不会被自动加载（按目录注入的只有 `AGENTS.md`，`README.md` 不在候选集）。用户决定照 digest 的八章判定落地第一批。

**决定**（四件，同一 diff）：

1. **`notes-tree` 门禁**（`checks/gates/notes-tree.mjs`，装配进 `run-gates.mjs`）：深度 1 闭集
   `{proposed,implemented,rejected,archived}` 且根只许 `README.md`/`AGENTS.md`；深度 2 只许文件，唯一子目录 =
   `archived/receipts/`；`.md` 名 = `YYYY-MM-DD-<slug>.md`（slug 全小写，点号留给版本号）或
   `README.md`/`AGENTS.md`；任何 `INDEX.md`、任何无日期文件名、任何深度 4 目录红。
2. **状态行收紧**（并入同一门，前向生效 = 文件名日期 ≥ `2026-11-14`）：`状态：` 全文件恰好 1 行、在文件前
   12 行内；`implemented/` 与 `archived/` 的状态词须以 `implemented|已交付|已消化` 开头（**归档保留实现状态，
   不改写成 archived**——位置是位置，状态是状态）；`proposed/` 只查唯一性（批准标记仍归 `proposals`）；
   `rejected/` 的状态词须以 `rejected` 开头，文件名日期须是真实日历日期（2026-11-14 后续，
   见 [形状层 Note](2026-11-14-shape-layer-and-structure-semantics.md)）。
3. **两份载体**：`notes/implemented/AGENTS.md`（两条义务）与 `notes/archived/AGENTS.md`（一条禁令 + 链接路径
   例外），各 8 行，指回本层 README；同 diff 加两条 `DOC_LINE_BUDGETS`（9/9）。
4. **义务句搬家**：`notes/implemented/README.md` 的「事实落点/决定冻结」改为指向 `AGENTS.md` 的一行——
   一处事实一个家，门牌负责注入，宪章负责收什么/不收什么。

**为什么是这两条而不是孙目录**：class 孙目录要养第二套闭集（DSH 自己承认 README 表与源码是两份字面副本），
本仓 77 篇还没到 browse 失效；而「每一层必须闭集、纪律载体必须放会被加载的位置」是同一份 digest 里可机械化的
那一半。位置不动：`notes/` 留在仓根。

## 输掉的方案

- **只做门、不做载体**（卡方案 B）：形状锁住，但军规继续躺在 `README.md` 里睡觉——E2 的病因原样保留。
- **只做载体、不做门**（卡方案 C）：改动最小，但五种不可能形状继续隐形；形状问题比载体问题更贵（不可见 vs 读不到）。
- **把 `notes/implemented/README.md` 改名成 `AGENTS.md`**：一步到位、不必两份；否决——该文件被全仓大量
  Markdown 链接，改名会让 `md-links` 成片红，且「给人浏览的宪章」与「给 agent 注入的门牌」语气不同。
- **把非 `.md` 证据件也纳入形状判**：`archived/` 有 2 个 pin-review `.json`，为它们发明一条形状规则的收益为零。
- **对存量 Note 回扫状态行**：`archived/` 有 4 篇生效日前的无状态行 Note；回扫等于改冻结层，违背 §五。
- **新增 D 号路由行**：`decisions.md` 67/67 顶格，本变更是机制增补而非重立（同类 gate 增补如 `naming-contract`
  也未进台账）；机制入口已在 [notes/README](README.md) §三。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | `notes/` 的合法形状（目录闭集/深度/文件名/INDEX 禁令）与状态行纪律（唯一/位置/目录同轴） |
| 唯一入口 | `checks/gates/notes-tree.mjs`（判据 + 负例）；规则原文 = [notes/README](README.md) §一「形状」段与 §三 |
| 读载体 | agent：`notes/implemented/AGENTS.md` / `notes/archived/AGENTS.md`（按目录自动注入）+ 门禁红；人：`notes/README.md` §一 表 |
| 写载体 | 新增或搬动 Note 的人；新增目录/改状态行前跑 `pnpm verify` |

## 未覆盖轴

- [unprovable] **目录门牌注入后的上下文 token 占比**：两份 8 行门牌只进动该层的会话，`doc-budget` 管行数不管 token → `notes/implemented/AGENTS.md`、`notes/archived/AGENTS.md`
- [policy] **冻结层链接容忍度双轨**：`.md` 断链零容忍与历史证据天花板按职责分立 → `checks/gates/notes-archived-links.mjs`、`checks/gates/link-debt.mjs`
- [policy] **Note 论证散文质量**：`## 输掉的方案` / `## 验证` 深度归完成定义与独立盲审，不做词面门禁 → `.agents/skills/agent-note-definition/SKILL.md`
- [unprovable] **“该写 Note 却没建文件”的存在性判断**：静态门只判已存在文件形状，漏写归收尾盲审 → `checks/gates/notes-tree.mjs`、`.agents/skills/close-out-definition/SKILL.md`
- [policy] **非 `.md` 归档证据件命名**：JSON 等附件不套 Note 日期命名规则 → `checks/gates/notes-tree.mjs`

## 验证

真跑过的命令与形态（2026-11-14，工作树；红证均为真树植入 → 还原 → 绿）：

| 层 | 命令 | 断言/结果 |
|---|---|---|
| 门禁回归 | `node tests/checks/notes-tree.test.mjs` | **19 项 ALL PASS**（合法树零问题、七条形状红、四条状态红/绿、缺失不崩、ok 行） |
| 真树红证① | 植入 `notes/zz-lifecycle/` → `node checks/run-gates.mjs` | `FAIL notes-tree: notes/zz-lifecycle/ — 未知生命周期目录（允许：proposed、implemented、rejected、archived）`；删除 → `ALL PASS` |
| 真树红证② | 植入 `notes/implemented/zz-no-date.md` | `文件名须为 yyyy-mm-dd-<slug>.md（slug 全小写，点号只用于版本号；日期前缀是地址的一部分）` |
| 真树红证③ | 在 notes 根植入一篇散件（日期命名的 .md） | `根目录只允许 README.md / AGENTS.md（Note 必须住生命周期目录）` |
| 真树红证④ | 植入 `INDEX.md` | `集中索引禁止（D34：目录树即清单；…）` |
| 真树红证⑤ | 植入 `notes/implemented/zz-probe/2026-11-14-x.md` | `未登记子目录（implemented/ 只许文件；唯一允许的第二层目录 = archived/receipts/）` |
| 真树红证⑥ | 日期 ≥ 生效日的 Note 复制第二行「状态：」 | `状态行必须恰好 1 行（实际 2 行）` |
| 真树红证⑦ | 同篇状态词改 `proposed` | `状态词须以 implemented/已交付/已消化 开头（archived/ 保留实现状态，不改写成 archived）` |
| 真树红证⑧ | `archived/receipts/` 下再建目录 / 放无日期文件 | `只许文件（不允许深度 4 目录）` / 文件名红 |
| 组合红 | 同时植入①②③ → `node checks/run-gates.mjs` | `EXIT=1`，一条 `FAIL notes-tree:` 点名三处；还原 → `verify: ALL PASS` |
| 反向豁免 | 合法新 Note（日期 ≥ 生效日、状态行 ×1） | `PASS notes-tree（…；状态行 ×1 篇新写）`——不是一律红 |
| 载体注入 | 本会话写 `notes/implemented/AGENTS.md` 后 | 平台注入原文 `Additional instructions from: notes/implemented/AGENTS.md`（`notes/archived/AGENTS.md` 同）；删探针的对照见研究 E2 |
| 全量 | `pnpm verify` / `pnpm test` / `pnpm test:checks` / `pnpm lint` / `pnpm dup` | **ALL PASS** / 247 files · 2034 tests 全绿 / 3 PASS 0 FAIL / 0 / 0 clones |

**首版抓到自己的假守卫**：`④` 第一版是绿的——根文件走了通用命名规则，`2026-11-14-root-stray.md` 因为名字本身
合规被放行。这正是「先造红再相信绿」要抓的形态（`ledger-routing` 同款）；改为根文件只认 allowlist 后转红。

**顺带修的工具错报**：`notes:audit` 原先把 `AGENTS.md` 也当 Note（报「无决定节」）——已让工具与 `README.md` 同规则跳过；它只读，不影响门禁。

**未跑**：真模型 / 浏览器面（本变更无模型可见行为）；`coverage-ratchet`（新增文件不在覆盖率插桩面：门禁在 `checks/`、回归在 `tests/checks/`，二者都不在 vitest coverage include）。
