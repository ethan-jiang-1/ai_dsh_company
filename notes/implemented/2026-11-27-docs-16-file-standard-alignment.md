# 2026-11-27 · `root → docs/` 16 文件核心骨架对齐、UTF-8 字节预算与自动目录收口

状态：implemented（2026-11-27 落地；批准：用户 `/goal` 明确按 `plan-a-ai-dsh-company.md` 与默认护栏方案执行；决定号 = [D71](../../docs/decisions.md#d71)；取代 [2026-11-16-retire-claude-md-symlink.md](./2026-11-16-retire-claude-md-symlink.md)，并部分取代 [2026-11-14-decision-ledger-unification.md](./2026-11-14-decision-ledger-unification.md)、[2026-11-27-docs-architecture-and-dependency-alignment.md](./2026-11-27-docs-architecture-and-dependency-alignment.md) 与 [2026-11-10-docs-dsh-alignment.md](./2026-11-10-docs-dsh-alignment.md)）

## 决定

1. **Phase 0–1 · 基线收口、DSH 软链与 UTF-8 字节预算（`8fa92411`、`1675b7bb`）**：
   - 补齐 `tests/client/startup/command-scope-hint.spec.ts` 真红→真绿 `负例留证` 与 `tests/BUG-COVERAGE.generated.md` 行号对齐，消除基线红灯。
   - 恢复 DSH 原生软链 `CLAUDE.md -> AGENTS.md` 与 `.claude/skills -> ../.agents/skills`，在 `tools/lib/core/asset-lanes.mjs` 登记 `.claude/**`，并将双软链与 `## 布局` 节（围栏与 Markdown 表格双形态）存在性校验并入既有 [`checks/gates/layout-block.mjs`](../../checks/gates/layout-block.mjs)（复用 `repo-markdown.mjs` 的 `headingSections` / `splitGfmTableCells`，零裸正则，不新增 gate 文件）。
   - 将 [`checks/gates/doc-budget.mjs`](../../checks/gates/doc-budget.mjs) 从物理行数切换为 UTF-8 字节预算（`DOC_BYTE_BUDGETS`，保留 5% headroom 与 20% 反向棘轮），同时对 `AGENTS.md` 与 `docs/**` 强制非表格/非代码块单行正文 `≤ 350` 字符（反单行压缩正文墙）。
   - 同步修复 4 处现行漂移：`docs/guides/bootstrap.md` 顶层可执行命令链、`docs/guides/dev-loop.md` 节号连贯重排（`§0 → §1–§5`）与 `pre-push` 清单对齐、失效的旧指针与考古注脚清理、以及 `AGENTS.md` 与核心文档长行拆解。
2. **Phase 2 · 根入口首屏重构与 `docs/README.md` 入口化（`6fd7db80`）**：
   - 重构根 [`AGENTS.md`](../../AGENTS.md) 首屏（定位 + 身份边界 + 3 步 1 跳最小路径 + 可点击 `## 布局` 表格 + 精简命令表与全量命令表指针，UTF-8 < 12 KiB）。
   - 将原文档地图入口更名为 [`docs/README.md`](../../docs/README.md)，顶部增加「30 秒按问题找入口」与「推荐阅读顺序」，维持 D34/D37 无第二清单原则；冻结归档层仅以确定性脚本替换相对链接目标（零正文修改，`link-debt` 维持 `4/0/0`）。
3. **Phase 3 · 16 文件核心骨架（顶层 6 文件 + 三分区，`1e0eae05`）**：
   - 顶层 `docs/` 收敛为恰好 6 文件：`README.md`、`AGENTS.md`、`architecture.md`（吸收原运行态时序与四条状态轴）、`decisions.md`（升格为台账真身，取消旧 8 行门牌）、`policy.md`（吸收原维护面契约作为 `§P6`）、`testing.md`。
   - 合并为三分区：`docs/contracts/`（收容 `client-ui.md`、`host-and-lib.md`、`content-charter.md`、`repo-hygiene.md` 及既有合同，统一顶部 `> **读法**：`）、`docs/guides/`（合并环境/调试/现场运维为 `run-ops.md`，迁入 `orient.md`）、`docs/reference/`（统一命名为 `glossary.md`、`external.md`、`surface-exceptions.md`）。
   - 升级 [`checks/gates/doc-taxonomy.mjs`](../../checks/gates/doc-taxonomy.mjs) 强守三分区、最大目录深度 2、分区禁建子 README 与禁链 `_backlog/`；同步 `ledger-routing.mjs`、`charter-entry.mjs`、`dev-product-parity.mjs`（并将 `dev-product-parity` 缺失目标由静默跳过改为 fail-closed 报红）及全部测试与活跃 Note N5 路径。
4. **Phase 4 · 子树 `AGENTS.md` + 自动包目录 + 双向命令表（`5e684beb`）**：
   - 新增 [`packages/company-pack/AGENTS.md`](../../packages/company-pack/AGENTS.md)（不随包分发，已登记 `SURFACE_RULES`）与 [`checks/AGENTS.md`](../../checks/AGENTS.md)（均 < 5 KiB）。
   - 新增纯逻辑 [`tools/lib/repo/package-catalog.mjs`](../../tools/lib/repo/package-catalog.mjs)、入口 [`tools/repo/gen-catalog.mjs`](../../tools/repo/gen-catalog.mjs)（`pnpm gen:catalog`）与单测 [`tests/tools/package-catalog.spec.ts`](../../tests/tools/package-catalog.spec.ts)，生成 [`docs/reference/package-catalog.generated.md`](../../docs/reference/package-catalog.generated.md)，并将新鲜度校验并入既有 [`checks/gates/script-index.mjs`](../../checks/gates/script-index.mjs)（门禁总数保持 `75/75` 不突破 `MAX_GATES`）。
   - 新增 [`docs/reference/commands.md`](../../docs/reference/commands.md)，将 [`checks/gates/command-refs.mjs`](../../checks/gates/command-refs.mjs) 升级为与根 `package.json` `scripts` 的双向校验。

## 输掉的方案

- **新建独立门禁文件**：`checks/gates/` 已处于 `75/75`（`MAX_GATES = 75`，`policy §P2` 硬顶），新建文件会直接撞破棘轮并增加维护负债；并入既有 owner 门禁（`layout-block` / `script-index` / `command-refs`）零新增文件且职责内聚。
- **保留原 reference 决策台账 + 顶层 8 行门牌及旧四分区结构**：虽能省去冻结归档链接路径替换，但导致顶层滞留 11 份散件、双路径台账与冗余架构子目录，偏离三仓统一 16 文件骨架目标。采用确定性脚本仅替换相对链接目标并逐文件核验 0 正文改动，兼顾结构收口与归档保真。
- **继续保留物理行数预算**：实测物理行数逼出多篇文档 400–800 字单行压缩正文墙；切换为 UTF-8 字节预算 + 350 字单行正文墙检查才贴合中文文档信息密度与 DSH 词数预算原意。
- **手工维护 `package-catalog` 清单**：违背 D28/D34（枚举型事实的家 = 实现自己），由 `gen-catalog.mjs` 从 `package.json`、`cordis.patch.yml` 与 `presets/*/agent.cordis.yml` 派生并受 `script-index` 守卫可根除清单漂移。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| DSH 根软链与布局表校验 | [`AGENTS.md`](../../AGENTS.md) · [`checks/gates/layout-block.mjs`](../../checks/gates/layout-block.mjs) | `CLAUDE.md -> AGENTS.md`、`.claude/skills -> ../.agents/skills`；`pnpm verify` |
| 文档字节预算与反单行正文墙 | [`docs/AGENTS.md`](../../docs/AGENTS.md) · [`checks/gates/doc-budget.mjs`](../../checks/gates/doc-budget.mjs) | `DOC_BYTE_BUDGETS` + `proseWallHits`（≤350 字符） |
| 顶层 6 文件 + 三分区拓扑 | [`docs/README.md`](../../docs/README.md) · [`checks/gates/doc-taxonomy.mjs`](../../checks/gates/doc-taxonomy.mjs) | 三分区（`contracts`/`guides`/`reference`）、最大深度 2、禁子 README、禁链 `_backlog/` |
| 决策台账真身（D1–D71） | [`docs/decisions.md`](../../docs/decisions.md) · [`checks/gates/ledger-routing.mjs`](../../checks/gates/ledger-routing.mjs) | `ledger-routing` 守双表锚点、连续性与单格 ≤100 字 |
| 包与能力自动目录 | [`docs/reference/package-catalog.generated.md`](../../docs/reference/package-catalog.generated.md) | 写 = `pnpm gen:catalog -- --write`；校验 = `checks/gates/script-index.mjs` |
| 全量脚本命令参考 | [`docs/reference/commands.md`](../../docs/reference/commands.md) | 双向校验 = `checks/gates/command-refs.mjs` ↔ 根 `package.json` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| `doc-budget`（`pnpm verify`） | 文档指针 | 真树向 `docs/guides/orient.md`（迁移前原路径）追加 380 字单行 → `FAIL doc-budget: … 单行正文 380 字符超上限 350`；还原 → PASS；另有 `tests/checks/gates-negative.test.mjs` 字节超限/空置 >20%/缺失/表格豁免 6 条用例 |
| `layout-block`（`pnpm verify`） | 文档指针 | 真树将 `CLAUDE.md` 软链改为普通文件 → `FAIL layout-block: CLAUDE.md 不是符号链接`；还原 → PASS；`tests/checks/gates-negative.test.mjs` 另测 `.claude/skills` 缺失/目标不符/死路径/无布局节（×0 防空转） |
| `doc-taxonomy`（`pnpm verify`） | 文档指针 | 真树新建 `docs/contracts/zz-sub/deep.md` 与分区子 README 探针 → `FAIL doc-taxonomy: 超过最大深度 2 …；分区目录禁止子 README.md`；删除 → PASS |
| `script-index`（`pnpm verify`） | 文档指针 | 真树篡改 `docs/reference/package-catalog.generated.md` → `FAIL script-index: docs/reference/package-catalog.generated.md 与 packages/company-pack 源码不一致`；还原 → PASS |
| `command-refs`（`pnpm verify`） | 文档指针 | 真树删除 `docs/reference/commands.md` 中 `gen:catalog` 行 → `FAIL command-refs: package.json 脚本未登记在 docs/reference/commands.md：gen:catalog`；还原 → PASS |
| `dev-product-parity`（`pnpm test:checks`） | 文档指针 | `tests/checks/gates-negative.test.mjs` 夹具省略 `docs/guides/orient.md` → `FAIL dev-product-parity: 退役词校验目标缺失：docs/guides/orient.md`（杜绝 `existsSync` 静默跳过） |
| 单元 + 变异 + 全量回归 | 纯逻辑 / 配置组合 / 文档指针 | `pnpm verify` ALL PASS（`gate-wiring ×75`）；`pnpm test:checks` 11/11 PASS；`pnpm test` 305 files / 2900 tests PASS；`pnpm typecheck` / `pnpm lint` / `pnpm dup` / `pnpm coverage:ratchet`（242 文件 PASS）/ `pnpm notes:audit --strict` 均 0 硬项；`vendor/dsh` 零改动 |
| 独立盲审与 4 场景盲测 | 文档指针 | 独立只读子代理 Fresh-Agent 4 场景盲测 **4/4 PASS**（S1 1–2 跳、S2 1 跳、S3 1–2 跳、S4 1–2 跳，零断链）；`policy §P5` 独立只读盲审经三轮收敛（首轮 4 项、二轮 3 项 Blocker 全部逐条修复），**三轮独立盲审 `PASS (0 Blocker)`** |

## 未覆盖轴

- [covered] `docs/` 16 文件骨架、软链、字节预算、自动目录新鲜度、命令双向对齐与 `dev-product-parity` 缺失 fail-closed → [`tests/checks/gates-negative.test.mjs`](../../tests/checks/gates-negative.test.mjs)
- [covered] `package-catalog` 扫描与渲染分支及覆盖率棘轮 → [`tests/tools/package-catalog.spec.ts`](../../tests/tools/package-catalog.spec.ts)
- [environment-gap] 真模型认证档 `entry-probe`（需 `DEEPSEEK_API_KEY` 与真实 Web 会话）→ [`checks/lanes/entry-probe.entry.mjs`](../../checks/lanes/entry-probe.entry.mjs)
- [policy] `vendor/dsh/` 上游子模块内容保持只读零改动（本轮不涉及升 pin）→ [`docs/contracts/release.md`](../../docs/contracts/release.md)
