---
status: 已结
opened: 2026-11-14
---

# 推敲：决策台账跨仓对齐——现行/退役双表分离、行锚点、入口显眼化与按格控长

> 立卡：2026-11-14 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 独立只读 research 子代理两轮盲审通过（首轮抓出 2 条 Blocker〔漏行尾竖线四列逃逸、表外非结构块与 H3+ 漏算〕与 4 条建议，全部修毕后二轮复审 Blockers = 0）
>
> **结论/去向**：note — [decision-ledger-unification Note](../../../notes/implemented/2026-11-14-decision-ledger-unification.md)

**问题与期望结果：** 横向对比兄弟项目（`ai_dsh_bsimulation` 与 `ai_dsh_deep_research`）的决策治理体系后确认：本仓确立的**三层职责切分**——① `docs/contracts/` 管现在时语义（What）、② [decisions.md](../../../docs/reference/decisions.md) 管 `≤100` 字纯路由（Where）、③ `notes/implemented/` 与 `notes/archived/` 管理由、输掉的方案与验证证据（Why）——在防腐烂与 Agent 上下文渐进披露（61 条仅 ~6KB，零截断）上明显优于“胖台账”。但本仓仍存在三处影响人机查阅与持续增长的结构摩擦，需一次收口并与兄弟仓统一心智模型：
1. **现行与废止混排**：单表从 D1 排到 D61，夹杂多条已废止决定（如 D11、D19+D21、D23+D24 的 `历史：…已退役` 及 D59 的 `~~删除线~~`），随 D 号破百后扫读噪音递增；且缺少 `#dN` 行级锚点，外部引用只能跳文件头、不能跳具体行。
2. **入口层级偏深**：兄弟仓均在 `docs/` 顶层一眼可见，本仓收在二级目录 [decisions.md](../../../docs/reference/decisions.md)，人类维护者直觉翻找 `docs/` 时易误判缺失。
3. **逐行预算制造反向激励**：`checks/gates/doc-budget.mjs` 将追加型路由表锁死在 `67/67` 行，近两周内 6 次因新增 1 条 D 号被迫手工给门禁 `+1`，甚至在 [2026-11-14 Note](../../../notes/implemented/2026-11-14-notes-tree-and-carrier-gates.md) 中出现“因 `67/67` 顶格故不登记新 D 号”的扭曲信号。

**当前情况：**
- [decisions.md](../../../docs/reference/decisions.md) 原共 67 行（含 D1–D61，其中合并行 `D19+D21`、`D23+D24`），由 `checks/gates/ledger-routing.mjs` 把守三列形状、`一句话 ≤ 100 字符`、家链接可解析及编号非降序。
- 全仓 `notes/archived/` 与 `_backlog/_archive/` 冻结层已有十余处相对链接指向 `docs/reference/decisions.md`；按 `notes/archived/AGENTS.md` 冻结铁律，真身留在原位可保持冻结层零改动、零断链。
- `docs/policy.md` §P2 已实行门禁文件数只降不升棘轮（`≤ 75`），所有台账规则升级必须在既有 owner `checks/gates/ledger-routing.mjs` 与 `checks/gates/doc-budget.mjs` 内完成，不新建门禁文件。

**未决问题：** 已由用户 2026-11-14 点名按本卡落地解清。入口显眼化采用“真身留 `docs/reference/decisions.md` + `docs/decisions.md` 8 行零事实门牌页（同 `docs/orient.md` 纯导航定位）”，使三仓均可通过 `docs/decisions.md` 直达且不破冻结链。

**下一步：** 已完成实施、真树红绿留证、独立只读 `research` 子代理两轮语义盲审（`Blockers: 0`）与归档收口。

---

## 范围与排除项

**做（四件事）：**
1. **双表分离 + `#dN` 行锚点**：将 [decisions.md](../../../docs/reference/decisions.md) 拆为 `## 现行决定` 与 `## 已退役` 两张同构三列表（`| # | 一句话 | 决定的家 |`）。每行首格统一带 `<a id="dN"></a>D#` 锚点（合并行保留双锚点如 `<a id="d19"></a><a id="d21"></a>D19+D21`，编号永不重用）；被完整取代或废止的条目（D11、D19+D21、D45、D48、D59，逐条核对原 Note 后定；D23+D24 与 D34 因主干规则仍在 `docs/policy.md`/`notes/README.md` 现行有效留主表改写现行口径）移入 `## 已退役` 并指明取代者与原 Note；部分修订仍现行有效的条目留在主表，只写当前有效口径。
2. **三仓同路径门牌入口**：新增 `docs/decisions.md`（≤8 行纯导航门牌，声明三层职责一句话并直链 `./reference/decisions.md` 的 `#现行决定` / `#已退役` 与 `../notes/README.md`，零事实复述），并在 [docs/index.md](../../../docs/index.md) 顶层书架登记，使人类与 Agent 在三仓打开 `docs/decisions.md` 均有一致入口，同时原路径一切冻结归档链保持零改动。
3. **解除逐行 `+1` 摩擦、改由结构门控长**：从 `checks/gates/doc-budget.mjs` 的固定行数表移出 `docs/reference/decisions.md`，将台账控长完全收归 `checks/gates/ledger-routing.mjs`——由于锁死单 H1 + 双 H2、禁代码块/块级 HTML/frontmatter/H3+、表外散文 `≤ 10` 行且表内每格硬卡 `≤100` 字符，即使增长到 D200 全文也不足 18KB，不再因正当新增 D 号逼改门禁常量。
4. **`ledger-routing.mjs` 双表与锚点守卫升级**：在既有 `checks/gates/ledger-routing.mjs` 内升级校验——① `## 现行决定` 与 `## 已退役` 两表表头均在场、禁非结构块与 H3+ 且表外散文 `≤ 10` 行；② 两表每行均满足闭合三列、`一句话 ≤ 100` 字符、家含真实可解析链接、首格含匹配 `<a id="dN"></a>` 无前导零锚点；③ 现行表禁止残留 `~~` 删除线或 `已退役`/`**历史**` 字样（防退役决定滞留主表）；④ 两表各自内部编号严格递增，且跨两表 D 号集合全局唯一、无漏号。

**不做（排除项）：**
- 不把决定理由、参数细节或输掉的方案搬回台账（严守 `≤100` 字纯路由定位）；
- 不修改 `notes/archived/` 或 `_backlog/_archive/` 冻结历史文件；
- 不新增独立门禁文件（守 `checks/gates/` 总数不增棘轮）。

---

## 方案与取舍

### 统一的三层决策架构（与兄弟仓对齐后的目标态）

| 层级 | 回答问题 | 本仓载体 | 兄弟仓映射 | 增长性质 |
|---|---|---|---|---|
| **第 1 层：现在时合同** | 系统现在怎么工作（What） | `docs/contracts/*.md` + 顶层宪法 | 项目 A：`openspec/specs/` + `<bsim>/docs/design/`<br>项目 B：`<dr>/docs/design/` + `<dr>/docs/evaluation.md` | 随代码同 diff 覆写，不留历史 |
| **第 2 层：纯路由台账** | 有哪些决定、编号去哪查（Where） | `docs/decisions.md`（门牌）→ `docs/reference/decisions.md`（现行/已退役双表，`≤100` 字/行） | 项目 A / B：`<sibling>/docs/decisions.md`（现行/已退役双表，单格控长 + 必带家链接） | 极薄线性增长（每决定 1 行，D200 仍 `<18KB`） |
| **第 3 层：理由与负知识** | 为什么选 A、否决了什么、怎么验的（Why） | `notes/implemented/` + `notes/archived/` | 项目 A：`openspec/changes/archive/*/design.md` + `research/`<br>项目 B：`notes/implemented/` + `notes/archived/` | 单篇冻结沉淀，按需点开，不占常驻窗口 |

### 输掉的方案

- **方案 A：把 `docs/reference/decisions.md` 物理 `git mv` 到 `docs/decisions.md`** — 输在会打断 `notes/archived/` 与 `_backlog/_archive/` 十余处冻结历史相对链接，迫使违背“冻结层不回写”原则去批量改档案；保留真身 + 顶层薄门牌页以最小成本兼顾跨仓路径一致与档案冻结。
- **方案 B：建符号链接 `docs/decisions.md -> reference/decisions.md`** — 输在跨目录深度的相对链接解析：台账内部写的是相对 `docs/reference/` 的 `../../notes/...`，经顶层门牌路径解析会越出仓库根变成 `../notes/...`，触发 `md-links` 断链红灯（根 `CLAUDE.md -> AGENTS.md` 成立是因为同处根目录）。
- **方案 C：效仿项目 B 把单格放宽到 `≤800` 字以支持单页读完细节** — 输在项目 B 已实测踩中 `29.4KB / 32KB` 硬顶并产生三处同步交税；`≤100` 字路由表才是抗规模化的收敛态。

---

## 验收标准

| 切片 | 类别 | 输入与前置状态 | 通过信号 | 负控（必须亲眼见红） | 证据命令 |
|---|---|---|---|---|---|
| **S1 双表分离与 `#dN` 锚点** | 文档形状 | 重排 `docs/reference/decisions.md` 为 `## 现行决定` + `## 已退役` 双表并补齐 `<a id="dN"></a>` | D1–D61 全员在册无漏号、无重号；现行表零删除线与退役残留；所有家链接在盘上可解析 | 在现行表植入 `~~旧方案~~` 或漏掉某个 D 号锚点 → `ledger-routing` 红；还原后绿 | `pnpm verify` |
| **S2 顶层门牌与书架对齐** | 导航 / 分层 | 新增 `docs/decisions.md` 并在 `docs/index.md` 顶层书架登记、补 `doc-budget` 预算行 | `doc-taxonomy`、`md-links`、`bare-path`、`doc-budget`（含 `≥5%` headroom）全绿 | 从 `docs/index.md` 移除 `decisions.md` 登记 → `doc-taxonomy` 红；还原后绿 | `pnpm verify` |
| **S3 表外散文控长替代逐行死卡** | 结构门禁 | 调整 `checks/gates/doc-budget.mjs` 与 `checks/gates/ledger-routing.mjs` | 正当追加一行合法 `D62` 无需修改任何门禁文件即 `pnpm verify` 全绿；表外散文超 10 行或单格超 100 字立即判红 | 临时在台账表外加第 11 行散文或单格写 105 字 → `ledger-routing` 红；追加合法测试行不改 `doc-budget` → 绿；还原后绿 | `pnpm verify && pnpm test:checks` |

---

## 事实与读者

- **事实（新增/修改）**：本仓决策台账的分表结构（现行/已退役）、行级锚点格式、顶层门牌入口与门禁控长规则。
- **唯一入口**：`docs/reference/decisions.md`（路由事实唯一家）、`docs/decisions.md`（跨仓同路径导航门牌）、`checks/gates/ledger-routing.mjs`（形状门禁唯一家）。
- **读载体 / 写载体**：人类维护者、跨会话开发 agent、`pnpm verify`、`tests/tools/notes-audit.spec.ts`。
- **环境坏法**：
  - **内容**：退役决定留在主表误导新会话；表外散文或非结构块膨胀；新增 D 号漏锚点、漏尾竖线或断链；
  - **根 / 叶**：跨目录层级相对链接解析（已排除跨层 symlink 方案）；
  - **生命周期**：新增 D 号与门禁固定行预算冲突导致跳过登记。

---

## 关闭条件

1. S1–S3 全部落地并通过 `prove-it-red` 实跑留证，`pnpm verify && pnpm test && pnpm test:checks` 全绿；
2. 经无历史上下文的独立只读 `research` 子代理盲审通过（blocker = 0）；
3. 交付 Note 落入 `notes/implemented/`，本卡回填真实 `## 落地证据` 后同变更归档至 `_backlog/_archive/settled_issues/`。

## 落地证据

- **改了哪些系统面（路径）**：`docs/reference/decisions.md`（拆为 `## 现行决定` 54 行 + `## 已退役` 5 行、补齐 D1–D61 `<a id="dN"></a>` 行锚点、清理失效节号）、`docs/decisions.md`（新建 8 行零事实门牌）、`docs/index.md`、`docs/AGENTS.md`、`checks/gates/ledger-routing.mjs`（双表+闭合三列+行锚点+禁代码块/H3++表外散文 ≤10 行+跨表连续唯一）、`checks/gates/doc-budget.mjs`（移出台账死卡、补 `docs/decisions.md` 9 行棘轮）、`tests/checks/ledger-routing.test.mjs`（新建 10 组回归单测）、`tests/checks/gate-mutation.test.mjs`（新增第 8 节 5 分支定向变异查杀）、[承载 Note](../../../notes/implemented/2026-11-14-decision-ledger-unification.md)。
- **实跑命令与结果**：
  - `node tests/checks/ledger-routing.test.mjs` → `10 pass / 0 fail`；
  - 真树四组植入负控 + 追加合法 `D62` 免改门禁全量正证（逐字原话见承载 Note `## 验证` 表）→ 全部先红后字节级还原转绿；
  - `set -o pipefail && pnpm verify && pnpm test:checks && pnpm notes:audit && pnpm test` → `verify: ALL PASS`（`doc-budget docs/decisions.md (8/9)`、`ledger-routing 现行 ×54 + 已退役 ×5，D1–D61`、`doc-taxonomy`、`notes-axes`、`backlog-liveness` 全绿）、`test:checks: 10 PASS / 0 FAIL`、`notes:audit` 零死路径/零取代缺回链、`pnpm test` 244 files / 2087 tests 全绿。

## 抽象度

- 换公司要改吗？→ **不会**；属研发决策治理与文档导航机制，与虚拟公司业务无关。
- 换产品类型要改吗？→ **不会**。
- 换做法要改吗？→ **不会**；只要维持“合同 + 路由表 + 理由载体”三层分离即成立。
- 只有机制本身变才改吗？→ **是**。
- 第二消费者：本仓后续所有开发会话与维护者，且同一套三层规范同步作为 `ai_dsh_bsimulation` 与 `ai_dsh_deep_research` 的对齐蓝本。
- 搬家成本：低；仅触及文档路由层与单一道既有静态门禁。
