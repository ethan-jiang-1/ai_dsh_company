# 决策台账跨仓对齐：现行/退役双表分离、行锚点、入口显眼化与按格控长

状态：implemented（2026-11-14 交付；批准：用户 2026-11-14 点名按卡落地；上游 = [决策台账跨仓对齐卡](../../_backlog/_archive/settled_issues/2026-11-14-decision-ledger-unification.md)；决定号 = [D36](../../docs/reference/decisions.md#d36)；扩展自冻结决定 [ledger-routing-table](../archived/2026-10-09-ledger-routing-table.md)）

## 决定

横向对账三仓（本仓、`ai_dsh_bsimulation`、`ai_dsh_deep_research`）的决策治理载体后，维持本仓 **三层职责切分**——① `docs/contracts/` 管现在时语义（What）、② [docs/reference/decisions.md](../../docs/reference/decisions.md) 管 `≤100` 字纯路由（Where）、③ `notes/implemented/` 与 `notes/archived/` 管理由、备选与验证证据（Why）——同时一次性消除本仓三处结构摩擦（现行与废止混排无行锚点、顶层缺同路径入口、`doc-budget` 逐行死卡逼出 6 次 `+1` 与跳号）：

1. **双表分离 + `#dN` 行级锚点**（[docs/reference/decisions.md](../../docs/reference/decisions.md)）：拆为 `## 现行决定`（54 行）与 `## 已退役`（5 行：`D11`、`D19+D21`、`D45`、`D48`、`D59`）两张同构三列表（`| # | 一句话 | 决定的家 |`）。每行首格统一带 `<a id="dN"></a>DN` 锚点（合并行保留双锚点如 `<a id="d19"></a><a id="d21"></a>D19+D21`）；完整废止项迁入 `## 已退役` 并附原 Note 与接替 `#dM` 链接，部分演进仍现行有效的项（如 `D23+D24` 的新上下文/Plan Mode、`D34` 的禁集中索引与日期命名、`D51` 的 `company` profile 与 host 账本边界）留主表且只写当前有效口径。
2. **三仓同路径导航门牌**（[docs/decisions.md](../../docs/decisions.md)）：在 `docs/` 顶层新增 8 行纯导航门牌（`doc-budget` 上限 9 行，零事实复述），一跳直链 `./reference/decisions.md#现行决定`、`#已退役` 与 `../notes/README.md`，并在 [docs/index.md](../../docs/index.md) 顶层书架及 [docs/AGENTS.md](../../docs/AGENTS.md) 登记；真身原地不动，使 `notes/archived/` 与 `_backlog/_archive/` 冻结历史相对链接零改动。
3. **表外散文控长接管逐行死卡**（`checks/gates/doc-budget.mjs` + `checks/gates/ledger-routing.mjs`）：从 `DOC_LINE_BUDGETS` 移出 `docs/reference/decisions.md`，改由 `ledger-routing` 锁死单 H1 + 双 H2、禁代码块/块级 HTML/frontmatter/H3+、表外散文 `≤ 10` 行 + 单格 `≤ 100` 字（即使涨到 D200 全文仍 `<18KB`，正当新增 D 号零门禁摩擦）。
4. **`ledger-routing` 升级双表与连续性守卫**（复用 `tools/lib/repo-markdown.mjs` 单原语 `headingSections` / `structuralLines`，门禁总数维持 75 不增）：硬查双节顺序、闭合三列表（含行尾竖线校验）、`<a id="dN"></a>DN` 匹配锚点（禁前导零）、现行表禁残留 `~~` / `已退役` / `**历史**`、各表递增、跨两表 `D1..Dmax` 全局唯一无断档、以及文件链接与 `#dN` 内部锚点全可解析。

## 输掉的方案

- **物理 `git mv` 将 `docs/reference/decisions.md` 挪回 `docs/decisions.md`**：会击穿 `notes/archived/` 与 `_backlog/_archive/` 十余处冻结相对链接，违背 `notes/archived/AGENTS.md` 冻结铁律；真身留原位 + 8 行顶层门牌同时保住三仓同路径入口与冻结层零回写。
- **符号链接 `docs/decisions.md -> reference/decisions.md`**：跨目录深度会导致表内 `../../notes/...` 从 `docs/` 解析时越出仓根触发 `md-links` 红灯（根 `CLAUDE.md -> AGENTS.md` 成立是因为同处仓根）。
- **效仿兄弟仓把单格放宽到 `≤800` 字写胖台账**：兄弟仓实测在 ~60 条时即逼近 `29.4KB / 32KB` 读取截断线并引发三处同步税；`≤100` 字路由表 + Note 正文才是抗百条增长的收敛态。
- **保留 `doc-budget` 对 `docs/reference/decisions.md` 的固定总行预算并预留大余量**：预留 >20% 会触发 `SLACK_FLOOR` 反向棘轮报红，贴着写又重演每增 1 条 D 号必改门禁常量的反向激励；按「表外散文上限 + 单格字数上限 + 禁非结构块」控形状更贴合追加型路由表。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 决策台账双表结构（`## 现行决定` / `## 已退役`）、`<a id="dN"></a>DN` 行锚点、`docs/decisions.md` 顶层门牌与表外散文控长规则 |
| 唯一入口 | 路由事实 = [docs/reference/decisions.md](../../docs/reference/decisions.md)；顶层门牌 = [docs/decisions.md](../../docs/decisions.md)；形状门禁 = `checks/gates/ledger-routing.mjs` |
| 读载体 | 人与跨会话 agent（`docs/decisions.md` → `docs/reference/decisions.md` 的 `#dN` 锚点）；机械门 `pnpm verify`（`ledger-routing` / `doc-taxonomy` / `doc-budget` / `md-links`）与 `pnpm notes:audit` |
| 写载体 | 新增或退役 D 号的会话（直接编辑 `docs/reference/decisions.md` 对应表，无需手改 `doc-budget.mjs`） |

## 未覆盖轴

- [covered] **`ledger-routing` 十组单测与五分支变异查杀**：双表缺失、表外散文超 10 行、混入代码块/H3+、漏行尾竖线四列行、漏锚点/前导零、现行表残留删除线/`已退役`、跨表重号与断档、内部 `#d99`/`#nonexistent` 悬空均单测与变异锁定 → `tests/checks/ledger-routing.test.mjs`、`tests/checks/gate-mutation.test.mjs`
- [policy] **反向漏登（制度级重立却未加 D 号）不设静态门禁**：「某改动算不算制度级重立」属语义判断，按门禁准入政策留收尾盲审与人工把关 → `docs/policy.md`、`.agents/skills/close-out-definition/SKILL.md`
- [policy] **兄弟仓（`ai_dsh_bsimulation` / `ai_dsh_deep_research`）各自落地节奏**：跨仓建议书已按约交付在未跟踪目录供各仓独立立项，不在本仓门禁扫描面内 → `docs/repo-hygiene.md`

## 验证

真跑过的命令与红/绿形态（2026-11-14，本仓工作树；全部真树植入负控均验证红灯后字节级还原）：

| 切片 / 层 | 命令或植入操作 | 实跑结果（逐字摘要） |
|---|---|---|
| TDD 先红 | 先升 `ledger-routing.mjs` + `doc-budget.mjs`，未改文档前跑 `node checks/run-gates.mjs` | `FAIL doc-budget: docs/decisions.md 不在盘上…` + `FAIL ledger-routing: 二级标题须依次为「## 现行决定」「## 已退役」（实为：无）` |
| 真抓自误 | 首稿 `D36` 摘要误写「现行/已退役」跑 `pnpm verify` | `FAIL ledger-routing: 「## 现行决定」含删除线或已退役/历史残留…：第 41 行`；改为「现行与退役分离」后绿 |
| S1 负控① | 现行表 `D1` 植入 `~~旧方案~~` → `ledger-routing` | `FAIL ledger-routing: 「## 现行决定」含删除线或已退役/历史残留（废止项移入「## 已退役」，现行项只写当前有效口径）：第 10 行`；还原绿 |
| S1 负控② | 去掉 `<a id="d1"></a>` → `ledger-routing` | `FAIL ledger-routing: D1–D61 编号断档（退役请移入「## 已退役」，不删号不跳号）：缺 D1；首列须带匹配的行锚点 <a id="dN"></a>DN…：第 10 行`；还原绿 |
| S2 负控 | 从 `docs/index.md` 临时移除 `decisions.md` 登记 → `doc-taxonomy` | `FAIL doc-taxonomy: 顶层门/宪法未在 index 书架列出：decisions.md`；还原后 `PASS doc-taxonomy（分层规矩在场 + 10 顶层门/宪法 + 25 tier 文档由目录承载）` |
| S3 负控 | 台账表外加至 11 行散文 + 单格写 105 字 → `ledger-routing` | `FAIL ledger-routing: 表外散文 11 行超上限 10 行（第 14 行起——台账只放路由表与极薄说明）；「一句话」须非空且 ≤ 100 字符（决定正文归 Note，本表只路由）：第 20 行（105 字符）`；还原绿 |
| S3 正证 | 追加合法 `<a id="d62"></a>D62` 且**不改任何门禁文件**跑完整 `node checks/run-gates.mjs` | `exit=0` · `PASS ledger-routing（现行 ×55 + 已退役 ×5，D1–D62 锚点连续唯一…）` · `verify: ALL PASS`；还原至 `D1–D61` |
| 单测与变异 | `pnpm test:checks`（含 `ledger-routing.test.mjs` 10 项 + `gate-mutation.test.mjs` 第 8 节 5 分支） | `ledger-routing.test.mjs` 10/10 PASS、`gate-mutation.test.mjs` 第 8 节 PASS，`test:checks: 10 PASS / 0 FAIL` |
| 独立盲审 | 无上下文只读 `research` 子代理两轮盲审（对照卡片原文 + diff + 9 份源码） | 首轮抓出 2 条 Blocker（漏行尾竖线四列行 `cells.length===5` 逃逸、表外非结构块/H3+ 漏算）与 4 条建议；全部修复补测后二轮复审 **`Blockers: 0`** |
| 全量回归 | `set -o pipefail && pnpm verify && pnpm test:checks && pnpm notes:audit && pnpm test` | `verify: ALL PASS`（`doc-budget docs/decisions.md (8/9)`、`ledger-routing 现行 ×54 + 已退役 ×5`、`notes-axes` / `backlog-liveness` 全绿）；`notes:audit --strict` 零死路径/零取代缺回链；`pnpm test` 244 files / 2087 tests 全绿 |

**未跑**：真模型 / 浏览器面（本变更纯属研发文档路由与静态结构门禁，不触及 `packages/company-pack/` 运行时或 UI）。
