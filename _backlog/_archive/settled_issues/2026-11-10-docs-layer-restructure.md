---
status: 已结
opened: 2026-11-10
---

# 落地：docs/ 分层重整——顶层门与宪法 + contracts/ + reference/

> 立卡：2026-11-10（补记）｜状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [docs-layer-restructure Note](../../../notes/implemented/2026-11-10-docs-layer-restructure.md)
> ｜ 审查：用户 — 2026-11-10 答复“都提交”＝接受本次形状（14 处内容值修正与 design/index 两个大偏离另卡）。
>
> ⚠ **本卡是补记**：改动已直接落在工作树（2026-11-10），未先立卡、未先给 dry-run、未等用户点头。用户当场指出“应该显性化、落 issue backlog”。裁决权在用户：接受 → commit + Note + 归档；不接受 → 还原。流程问题见「流程问题」。

## 问题与期望结果

`docs/` 顶层 18 个文件平铺：合同、地图、台账、规范、政策混在一个平面。人扫目录“无所适从”，agent 用 `glob docs/**/*.md` 也看不出路径的 scope。期望：按 DSH 的“树位置即 scope”分层——顶层只留门与宪法，按主题的当前语义进 `contracts/`，查表/台账进 `reference/`；[index.md](../../../docs/index.md) 首屏按目的路由，登记表留作查询。

## 背景：为什么 docs/ 也要按寿命分层

- DSH 自己的 `docs/` 就是这么分的：顶层 `architecture.md` / `testing.md` / `glossary.md`，其余进 `subsystems/`、`cookbook/`、`defensive-patterns/`、`postmortem/`、`user/`；`docs/AGENTS.md` 明说“文档的主题与树位置共同界定它的 scope；下层细节链接到 owner”。
- 本仓已有 `design/`、`guides/`，缺的是合同与查表两层的目录化；这不是“按时间分目录”，不违反 [docs/AGENTS.md](../../../docs/AGENTS.md) 的负知识。
- 触发：用户在做 [内容宪章](./2026-11-10-content-charter.md) 与 [producer/verifier](2026-11-10-producer-verifier-quality-loop.md) 时，发现“先想清楚归位、再动手”同样适用于 `docs/`；两张卡是引子，不是本卡的范围。

## 当前情况（实施已发生，待验收）

- 顶层：8 个 md（`AGENTS.md`、`index.md`、`orient.md`、`policy.md`、`project-map.md`、`repo-hygiene.md`、`runtime-map.md`、`testing.md`）。
- [contracts/](../../../docs/contracts/)（7）：data-model、delegation、demo、multi-human、presets、profile、release。
- [reference/](../../../docs/reference/)（3）：decisions、terminology、external-research。
- `design/`（4）、`guides/`（11）不变；`assets/` 不变。
- 链接：227+ 条、104 个源文件；其中 **122 个冻结层文件（126 条链接 + 散文路径）逐文件核为 HEAD 内容只做 old→new 路径替换**，日期/论断/证据未动。
- 代码/配置：16 处（`ledger-routing`、`dev-product-parity`、`tests/presets`、preset 注释等）。
- 预算：10 个 `DOC_LINE_BUDGETS` 键；未提额。
- 证据：`pnpm verify` ALL PASS（2 门无对象）；`pnpm test` 全量 167 files / 1347 passed。
- 迁移清单：`runtime/docs-migration/manifest.json`（gitignored；old→new + 逐条 link edit）。
- 工作树：187 文件（177 M + 10 rename）；随本卡与 Note 同一次 commit。

## 流程问题（本卡为什么是补记）

1. 直接动手，未先立卡；违反 [policy P1](../../../docs/policy.md)（feature 任务先 Plan Mode）与五道门“实施前有卡/授权”。
2. 未先给迁移清单 dry-run；187 文件的一次性 diff 对审阅不友好。
3. 纠正：本卡补记 + 实施留在工作树不 commit；用户接受则收敛为一次 commit + Note，不接受则还原。
4. 下一次同类结构迁移：先立卡（范围/验收/抽象度）→ 生成清单 dry-run → 用户点头 → 执行。

## 未决问题

1. **形状**：`testing` / `repo-hygiene` / `runtime-map` / `project-map` 留顶层（跨面宪法/地图），其余 7 份主题合同进 `contracts/`；`decisions` / `terminology` / `external-research` 进 `reference/`。是否接受？
2. **冻结层路径**：66 个 `notes/archived` / `_backlog/_archive` 文件只改链接路径，不改内容；是否作为长期规则写进 [notes/README](../../../notes/README.md) 或 [repo-hygiene](../../../docs/repo-hygiene.md)？
3. **commit 策略**：一次 commit（纯路径 + 预算 + 层表/index）还是拆成“移动 + 代码引用 + index”三笔？
4. **下一步**：本卡关闭后，另立一张“docs 值修正”卡（14 处过期计数/路径/旋钮），不混进本卡。

## 下一步

已收口（2026-11-10）：用户答复“都提交”＝接受；一次 commit 收敛（纯路径 + 预算 + 层表/index + 代码引用）；Note = [docs-layer-restructure](../../../notes/implemented/2026-11-10-docs-layer-restructure.md)；本卡 `git mv` 到 `_archive/settled_issues/` 并同步两处索引。

## 范围与排除项

- 范围：`docs/` 的目录形状；[docs/AGENTS.md](../../../docs/AGENTS.md) 层表；[docs/index.md](../../../docs/index.md) 首屏与登记路径；`DOC_LINE_BUDGETS` 键；站内链接（含冻结层路径）；代码/配置里的 docs 路径引用；对应窄测。
- 排除：docs 内容值修正（14 处，另卡）；两张触发卡的内容；`packages/company-pack/content/` 的三层内容；`vendor/`；不改 `docs/` 以外的文档结构。

## 已知与未决

- [index.md](../../../docs/index.md) 69/72、[AGENTS.md](../../../docs/AGENTS.md) 60/62——贴着上限，下一步加内容先搬/压。
- `link-debt` 未升（archived 20 / moved 0 / live 0）；没有 redirect stub。
- `_backlog/issues/2026-11-10-content-charter.md` 等未跟踪材料里的 docs 路径被顺带修正（路径 only），内容未动。
- 14 处过期值仍在：release 的 patch 计数、runtime-map 的 preset 计数、presets 的 browser 角色数、dev-loop 的角色数、architecture 的 255 行 / 4 preset、ui-demo 的 patch 数组、bootstrap 的角色数、environments 的“四条”、product-definition 的死路径、budget-and-ops 的 maxDepth 等。

## 方案与取舍

- **目录化（选用）**：顶层门/宪法 + `contracts/` + `reference/`；路径自带 scope，index 首屏给路由。
- **只改 index（输掉）**：`ls docs/` 仍然平铺；agent 的 `glob` 仍看不出 scope。
- **redirect stub（输掉）**：旧路径留 10 个 stub，平铺还在，视觉收益归零。
- **抬 `link-debt` 基线（输掉）**：违反棘轮方向；路径可维护，不该用欠账换整洁。
- **不搬（输掉）**：104 个引用会继续增长，越晚越贵。

## 关闭条件

验收标准全绿 + 用户验收 + commit + Note 落盘 + 卡归档。

## 验收标准

1. 树形状：顶层 8 md + `contracts/` 7 + `reference/` 3 + `design/` 4 + `guides/` 11；[docs/AGENTS.md](../../../docs/AGENTS.md) 层表含“参考”行与“合同 = 顶层跨面宪法 + contracts/”。
2. [docs/index.md](../../../docs/index.md) 首屏“先读（按目的）”5 行；33 行登记表路径全部指向新家；`doc-taxonomy` 绿。
3. 站内链接：`pnpm verify` ALL PASS；`notes-archived-links` 绿；`link-debt` 不升（archived 20 / moved 0 / live 0）。
4. 冻结层：122 个文件（126 链接 + 散文路径）只改路径；逐文件核 = HEAD 内容只做 old→new 替换；diff 不含内容/日期/论断变化；在 Note 记明规则与文件数。
5. 预算：10 个 `DOC_LINE_BUDGETS` 键更新；未提额；index 69/72、AGENTS 60/62。
6. 代码/配置：16 处引用更新；`pnpm test` 全量 167 files / 1347 passed；无类型/行为改动。
7. 流程：本卡补记的“先动手”问题写进 Note；下一次同类迁移按“先卡 → dry-run → 点头”执行。
8. 不混入：14 处内容值修正留独立卡；两张触发卡的内容未动。

## 审查（2026-11-10，补记后）

### 表面一致性（已修）

- `index.md` 的“现有文档（按层）”名不副实 → “现有文档（登记）”；底部“文档路由” → “按面找 owner”，与首屏“先读（按目的）”分工。
- 迁入 `contracts/` 的五份文件头 `顶层合同` → `合同`；`design/architecture.md` 头 `docs 顶层合同` → `docs 当前合同层`。
- `docs/AGENTS.md` 的 `§现有文档` 指针改为 `§现有文档（登记）`；合同定义 `某子系统` → `某主题/子系统`（`contracts/` 含 demo/multi-human/release，不是纯子系统）。
- 根 `AGENTS.md` 布局改为“门/宪法 → contracts/design/guides/ → reference/”，与 index 首屏同序。

### 证据

- `pnpm verify` ALL PASS（2 门无对象）。
- `pnpm test`：167 files / **1347 passed**（此前只跑了窄测）。
- 冻结层：**122 个改动文件全部 = HEAD 内容只做 10 条 old→new 路径替换**（逐文件字符串比对，0 例外）；链接/日期/论断无其它变化。
- 非冻结文件的链接改写是相对路径重算（如 `../delegation.md` → `../contracts/delegation.md`），不是内容改动；已抽样核对。

### DSH 对齐：骨架遵循，四处实质未对齐

| 维度 | DSH 推荐 | 本仓现状 | 判定 |
|---|---|---|---|
| 树位置即 scope | tier 目录；父页只按 purpose 介绍子页 | 顶层 8 门/宪法 + contracts/reference/design/guides | **遵循** |
| 子树 AGENTS | docs/AGENTS 管本层规矩 | 是 | **遵循** |
| 架构地图 | 顶层 `architecture.md`，改包前读 | 拆成 project-map / runtime-map（顶层）+ design/architecture（95% 顶格） | **部分** |
| 理由 | rationale → Agent Notes，不设 docs 层 | `design/` 是独立 tier，4/4 在 95–98%，仍含历史/现在时复述 | **未对齐（有意）** |
| 清单 | 树就是 inventory；不建中央索引 | index 33 行逐文档登记，`doc-taxonomy` 强制 | **未对齐（有意）** |
| 参考 | glossary/catalog 在顶层 | `reference/` 收术语/台账/外部材料，查表多一跳 | **适配** |
| 预算 | 按词计；目标内留 ≥5% headroom | 按行计；4 份 100%，index 69/72、AGENTS 60/62（<5%） | **未对齐** |
| 只写 now | 历史归 commits/Notes | 文档仍带日期、R1/R2、已退役叙述；14 处过期值 | **未对齐（内容债）** |
| 教程 vs 参考 | 分开；步骤 → cookbook | demo 58% 是分镜脚本，multi-human 带 runbook，presets 带工具清单/培养回路 | **部分** |
| skills / Notes | 工作流进 skills，决定进 Notes | 是 | **遵循** |
| testing 顶层 | 是 | 是 | **遵循** |
| 每 tier README | 有 | 无；用 docs/AGENTS + index 替代 | **适配（D28 禁第二清单）** |

### 结论

- 这次调整把**骨架**对齐了 DSH：树位置、tier 目录、子树 AGENTS、按 nature 分层、顶层收敛。方向是对的，搬家也值得。
- 但它没有让 docs/ 变成 DSH 合规；上面四个“未对齐”是既有债，搬家只是让它们更可见：`design/` 与 Agent Notes 重叠、index 是第二本清单、预算不留 5%、文档仍带历史。加上 demo/multi-human/presets 的 genre 混合，是下一层质量问题。
- 建议顺序：① 接受本次形状（卡内 cheap fix 已完成）；② 内容 pass：14 处值 + 历史/状态噪声 + 顶格文件瘦身到 ≥5% headroom；③ 单独决策两个大偏离：`design/` 是否并回 `notes/`、`index` 是否改成 tier map 并改 `doc-taxonomy`；④ 再决定 demo/multi-human/presets 是否按 genre 拆分。③④ 各自立卡，不顺手做。
- 严格按 DSH 的代价：architecture map 回顶层、design/ 并 notes/、index 瘦成 tier map、预算按词且留 5%；这会是比本次更大的搬家，本卡不做。

## 抽象度

- 换公司要改吗？不——`docs/` 是仓库层。
- 换产品类型要改吗？不。
- 换方法要改吗？不。
- 只有机制变才改吗？是——文档层结构。
- 第二消费者：没有；单例例外 = 本仓唯一的 `docs/` 树。搬家成本高（104 个引用文件 / 187 文件 diff）⇒ 第一天就该抽象；本卡是补付。
- 排除了更低的层：公司层/产品类型层只服务产品内容，不服务仓库文档；`docs/` 只能是 repo 级规范。
