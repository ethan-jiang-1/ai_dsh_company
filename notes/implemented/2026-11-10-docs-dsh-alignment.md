# 2026-11-10 · docs/ DSH 对齐五步

状态：implemented（2026-11-10 交付；五步 commit `69706354` / `177f887f` / `ab0fd622` / `3beabcca` / `abb02d1e`；`pnpm verify` ALL PASS / `pnpm test` 1347 passed / `pnpm typecheck` 绿；待用户验收）

上游 = [docs-dsh-alignment](../../_backlog/issues/2026-11-10-docs-dsh-alignment.md)

## 问题

结构骨架已对齐 DSH（顶层门/宪法 + contracts/ + reference/ + 子树 AGENTS），但四个实质偏离仍在：`design/` 与 Agent Notes 重叠、`index.md` 逐文档登记（第二本清单）、预算不留 5% headroom、文档仍带历史/状态散文。另有架构地图拆在 project/runtime 两图、`contracts/` 混三种 genre。

## 决定

1. **值/死路径/矛盾**：14+ 处修正，删数不改数（D28）；含 architecture 的 tool-face 自相矛盾、roles-isolation 的 `continuation-activation.ts` 死引用、product-definition 的死路径。
2. **index → tier 书架**：`docs/index.md` 只列 5 层（顶层门/宪法、contracts、guides、reference）+ “先读（按目的）”；33 行逐文档登记删除。`doc-taxonomy` 改为：顶层文档必须逐项链接；tier 文档只要求 tier 目录被链接；stray 目录/顶层未登记即红。`docs/AGENTS.md` 新文档规则同步（树即 inventory）。
3. **design/ → notes/**：4 篇设计文档写成 `notes/implemented/2026-11-10-{architecture,roles-isolation,ui-demo,role-content}-rationale.md`，原正文保留为决定时快照；现行语义以 `contracts/` 与顶层 `docs/architecture.md` 为准。`design/` tier 从树、层表、`doc-taxonomy`、预算中移除；顶层新增有序地图 `docs/architecture.md`。
4. **genre 拆分**：`demo` 的前置/分镜/场景 B–F → `guides/demo-scenes.md`；`multi-human` 的开门/交接/前提/迁移 → `guides/multi-human-runbook.md`；`presets` 的培养回路 → `contracts/cultivation.md`；工具行枚举改为指针（owner = preset 实现）。三份合同只留当前语义。
5. **5% headroom**：`doc-budget` 加“内容 ≤ 95% 上限”（`docs/` 适用；`docs/reference/` 豁免——查表/台账，DSH 允许 reference 穷尽）。9 篇 prose 文档瘦身/去重，**未提额**；`doc-taxonomy` 红证 3 条（顶层 stray / stray tier / tier 未链接）。

## 输掉的方案

- **保留 design/ 只瘦身**：DSH 的 rationale → Agent Notes 仍未对齐；设计层仍会继续长历史。
- **保留 index 逐文档登记**：树不是 inventory，第二本清单继续漂。
- **抬高预算凑 5%**：违反棘轮与 DSH “target 内留白”的本意；顶格是饱和信号，处置是搬/压。
- **保留 genre 混合**：合同里继续混 runbook/分镜，读者无法按性质选层。
- **redirect stub / 抬 link-debt**：用欠账换整洁，链接真相仍坏。

## 证据

- `pnpm verify`：**ALL PASS**（2 门无对象）。
- `pnpm test`：**167 files / 1347 passed**；`pnpm typecheck`：绿。
- `doc-taxonomy` 红证（实跑，红→还原→绿）：顶层 `docs/zz-taxonomy-probe.md` → 顶层未登记；`docs/zz-tier/zz.md` → 非 tier；删 index 的 `[contracts/](./contracts/)` → tier 未链接。
- `doc-budget`：`docs/` 全部 ≥5% headroom（`reference/` 显式豁免）；未提额。
- 链接：全站 `md-links` / `notes-archived-links` / `link-debt` 绿；冻结层只做路径替换（前序迁移已逐文件核）。
- 五步提交（时间顺序）：`69706354` 值修正 → `177f887f` index/taxonomy → `ab0fd622` design→Notes+architecture → `3beabcca` genre 拆分 → `abb02d1e` 5% headroom。

## 剩余风险 / 未做

- `docs/reference/` 的 5% 豁免是有意例外；DSH 按词计预算，本仓仍按行计——line headroom 是近似，不是词数保证。
- **now-only 未逐句清完**：活跃文档仍保留证据日期 / R1/R2 标注 / 少量“已退役”叙述；DSH 允许“version-specific contracts, examples, or evidence”保留数字，但未做全量历史散文清扫。
- 四篇主题 Note 保留原设计正文作为决定时快照；canonical 语义在 `contracts/` / `docs/architecture.md`，存在重复叙述风险，后续按需裁剪。
- 本次是文档结构/规则改动，未跑真模型或浏览器；不需要新的运行时证据。

## 相关

- 卡：[docs-dsh-alignment](../../_backlog/issues/2026-11-10-docs-dsh-alignment.md)。
- 地图：[docs/index.md](../../docs/index.md)；层表：[docs/AGENTS.md](../../docs/AGENTS.md)；架构：[docs/architecture.md](../../docs/architecture.md)。
- 四篇理由 Note：[architecture](./2026-11-10-architecture-rationale.md) · [roles-isolation](./2026-11-10-roles-isolation-rationale.md) · [ui-demo](./2026-11-10-ui-demo-rationale.md) · [role-content](./2026-11-10-role-content-rationale.md)。
