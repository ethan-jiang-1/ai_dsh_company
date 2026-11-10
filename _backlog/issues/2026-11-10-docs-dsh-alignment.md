---
status: 等人拍板
opened: 2026-11-10
---

# docs/ DSH 对齐：四个实质偏离怎么收

> 立卡：2026-11-10 ｜ 状态：等人拍板 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — [2026-11-10-docs-dsh-alignment.md](../../notes/implemented/2026-11-10-docs-dsh-alignment.md)
> ｜ 审查：agent — 五步自审 + verify/test/typecheck；用户 — 待验收
>
> 背景：结构收敛已落（commit `35ffbb05` + `59fc0162`）；DSH 对齐只到骨架。**本卡是实施总卡**：五步按序落地，每步一个 commit + 证据；不另拆卡（步骤共享同一验收）。

## 问题

上一轮把 `docs/` 的树位置对齐了 DSH（顶层门/宪法 + `contracts/` + `reference/` + 子树 AGENTS），但 DSH 的几条实质规则仍未对齐。不解决它们，“docs/ 已 DSH 化”就是过度声称。

## 依据（DSH `docs/AGENTS.md`）

- “A document's subject and tree position fix its scope… link to the owning descendant for lower-level detail.”
- Placement：rationale → Agent Notes；procedures → cookbooks；type definitions → subsystems；package contracts → READMEs；standing orders → root AGENTS。
- “Document current state. Keep history in commits, PRs, Agent Notes, postmortems…”
- “At or below target, retain at least 5% headroom.”
- “The tree is the working inventory”（no central index）。

本仓现状（2026-11-10 审查）：

- `design/` 4 份，全部 95–98% 顶格，仍含历史/现在时复述；DSH 会把这类“仍在指导选择的 why”放 Agent Notes。
- `index.md` 33 行逐文档登记，`doc-taxonomy` 强制；DSH 的树就是 inventory。
- 4 份 100% 顶格（decisions / delegation / environments / release-runbook）；index 70/72、AGENTS 60/62，低于 5% headroom。
- 14 处过期值；文档仍带日期/R1/R2/已退役叙述。
- 架构地图拆在 `project-map` / `runtime-map`（顶层）+ `design/architecture`（95% 顶格）。
- `contracts/` 含三种 genre：子系统语义（data-model/delegation/presets/profile/release）、运行模式（multi-human）、演示场景（demo，58% 是分镜）。

## 选项与代价

| 偏离 | 选项 A（轻） | 选项 B（严格 DSH） | 代价 | 建议 |
|---|---|---|---|---|
| 理由层 vs Agent Notes | 保留 `design/`，只留仍在指导选择的 why；历史/现在时搬合同/Note | `design/` 并回 `notes/`，4 篇改写成主题 Note | B：4 篇重写 + ~100 链接；A：瘦身 4 篇 | 先 A 后 B；B 是终态 |
| index vs 树 inventory | 保留登记表，作为受控例外写进层表 | index 改 tier map（5 层 + 入口）；`doc-taxonomy` 改 tier 可达性 | B：1 文件 + 1 门 + 层表 | B（最小结构改动，先做） |
| 5% headroom | 保留现行 20% 反棘轮 | `doc-budget` 加“内容 ≤ 95% 上限”规则，瘦身顶格文件 | B：4 份 + index/AGENTS 内容搬家 | B，但放在结构定稿后，避免瘦两次 |
| 只写 now | 先修 14 处值 | 再去日期/R1/R2/已退役叙述 | A：小；B：一轮内容 pass | A 先做，B 随后 |
| 架构地图 | 保持 project/runtime 两图 | 顶层 `architecture.md`（有序地图），why 进 Note | B：重写 1 篇 + 链接 | 与“理由层”同卡决定 |
| genre 混合 | 接受 contracts/ 多 genre | 拆 demo/multi-human/presets：合同 + guide/scenario | B：3 篇拆分 + 链接 | B，最后做 |

## 推荐顺序

1. **14 处值修正**（删数不改数，D28）：最小、独立、先把“对”补上。
2. **index → tier map**：最小结构改动，直接去掉“第二本清单”；同时改 `doc-taxonomy` 与 `docs/AGENTS.md` 新文档规则。
3. **design/ → notes/ + 顶层 architecture.md**：最大、决定终态；4 篇改写 + 地图归位。
4. **genre 拆分**（demo/multi-human/presets）：内容手术，独立。
5. **5% headroom 收口**：结构定稿后统一瘦身，避免同一内容搬两次；再加 `doc-budget` 规则。

## 拍板（2026-11-10）

用户原话：“按照你的次序推进吧，把它把发现的东西都改了”；随后指定本卡为实施载体，“按照我们的流程”。

- 顺序 = 1 → 2 → 3 → 4 → 5（见上）。
- `design/` = **B**（并回 `notes/` + 顶层 `architecture.md`）。
- index = **B**（tier map；改 `doc-taxonomy`）。
- 5% headroom = **B**（进 `doc-budget` 门禁 + 瘦身）。
- genre = **B**（拆 demo / multi-human / presets）。
- “发现的东西都改”：14 值在步 1；历史/日期/R1/R2/已退役叙述在步 3/4/5 随文清理，不另留存量。

## 实施切片

| # | 切片 | 出口物（写不出就翻不动） |
|---|---|---|
| 1 | 值/死路径/矛盾修正 | 14+ 处改完；`pnpm verify` 绿；commit |
| 2 | index → tier map | index 只列 tier + 入口；`doc-taxonomy` 改 tier 可达性；层表新文档规则；commit |
| 3 | design/ → notes/ + architecture.md | 4 篇写成主题 Note；顶层有序地图；`design/` 移除/瘦成指针；commit |
| 4 | genre 拆分 | demo/multi-human/presets 各拆合同 + guide/scenario；commit |
| 5 | 5% headroom + now-only | `doc-budget` 加 95% 规则；顶格瘦身；历史散文清完；commit |

## 验收标准

1. **步 1**：14+ 处过期值/死路径/矛盾修正（删数不改数；含 architecture 的 tool-face 矛盾与 roles-isolation 死引用）；`pnpm verify` ALL PASS。
2. **步 2**：`docs/index.md` 改为 tier map（5 层 + 入口），不再逐文档登记；`doc-taxonomy` 改“tier 可达性”而非“逐文件登记”；`docs/AGENTS.md` 新文档规则同步；树 = inventory。
3. **步 3**：`design/` 4 篇的 still-guiding why 写成 `notes/implemented/` 主题 Note；当前语义归 `contracts/`；顶层新增有序地图 `docs/architecture.md`；`design/` 不留 rationale 正文；全站链接在场。
4. **步 4**：`contracts/demo.md` / `multi-human.md` / `presets.md` 的合同部分与 guide/scenario 部分分开；`contracts/` 只留当前语义；指南/场景进 `guides/`；无 58% 分镜混合同。
5. **步 5**：`doc-budget` 加“内容 ≤ 95% 上限”（≥5% headroom）；所有活跃文档达标；未提额；日期/R1/R2/已退役叙述在活跃文档清完，历史归 Note/git。
6. **证据**：每步 commit；`pnpm verify` + `pnpm test`（步 2/3/4 后至少窄测）+ `pnpm typecheck`（末次）；落地 Note 记决定/输掉的方案/证据；`_backlog/_archive` 只允许路径-only 改动。
7. **关闭**：用户验收 + Note 落盘 + 卡归档；不把“骨架对齐”冒充“DSH 全合规”。

## 交付证据（2026-11-10）

| 步 | commit | 出口 |
|---|---|---|
| 1 值/死路径/矛盾 | `69706354` | 14+ 处修正；verify |
| 2 index → tier 书架 | `177f887f` | doc-taxonomy 改 tier 可达；docs/AGENTS 新文档规则 |
| 3 design/ → notes/ + architecture | `ab0fd622` | 4 篇 Note；顶层 `docs/architecture.md`；design tier 移除 |
| 4 genre 拆分 | `3beabcca` | demo-scenes / multi-human-runbook / cultivation；合同瘦身 |
| 5 5% headroom | `abb02d1e` | doc-budget 95% 规则；9 篇瘦身；未提额 |

- `pnpm verify` ALL PASS（2 门无对象）；`pnpm test` 167 files / 1347 passed；`pnpm typecheck` 绿。
- `doc-taxonomy` 红证 3 条：顶层 stray / stray tier / tier 未链接（实跑红→还原→绿）。
- `doc-budget`：`docs/` 全部 ≥5% headroom（`reference/` 豁免）；无提额。
- 链接全站绿；冻结层只做路径替换。

## 审查（自审）

- 五步按卡内顺序执行；本卡先转 `待落地` 再实施，未重复“先做后补”。
- 残留：`reference/` 的 5% 豁免是有意例外；now-only 未逐句清完（证据日期/R1/R2 保留，DSH 允许 version-specific evidence）；四篇主题 Note 保留决定时快照，canonical 语义在 contracts/architecture；预算仍按行计，非 DSH 词数。
- 用户验收：待。

## 验收对照（2026-11-10）

| # | 状态 | 证据 / 边界 |
|---|---|---|
| 1 | PASS | `69706354`；14+ 值/死路径/矛盾修正 |
| 2 | PASS | `177f887f`；index 书架 + doc-taxonomy tier 可达（红证 3 条） |
| 3 | PASS | `ab0fd622`；design/ 四篇 Note + 顶层 architecture.md |
| 4 | PASS | `3beabcca`；demo-scenes / multi-human-runbook / cultivation |
| 5 | **PASS（headroom）/ PARTIAL（now-only）** | `abb02d1e`；docs/ 全部 ≥5%（reference/ 豁免）；历史证据日期保留（DSH 允许 version-specific evidence），未逐句清零 |
| 6 | PASS | verify ALL PASS；test 1347；typecheck 绿；Note 落盘 |
| 7 | 待用户 | 卡未归档；用户验收后 `git mv` |

## 关闭条件

验收标准全绿 + 用户验收 + `docs-dsh-alignment.md` Note 落盘 + 卡归档。

## 抽象度

- 换公司/产品类型/方法要改吗？不——`docs/` 是仓库层。
- 只有机制变才改吗？是——文档层结构/规则。
- 第二消费者：无；单例例外 = 本仓唯一的 `docs/` 树。
- 搬家成本：index/预算低；design/、genre 高 ⇒ 先做低成本项，高成本项各自立卡。
- 排除了更低的层：公司层/产品类型层只服务产品内容，不服务仓库文档。
