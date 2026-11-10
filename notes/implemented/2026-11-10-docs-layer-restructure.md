# 2026-11-10 · docs/ 分层重整：顶层门与宪法 + contracts/ + reference/

状态：implemented（2026-11-10 交付；上游 = [docs 分层重整卡](../../_backlog/_archive/settled_issues/2026-11-10-docs-layer-restructure.md)；用户 2026-11-10 答复“都提交”= 接受本次形状）
> 触发：同日的 [内容宪章](../../_backlog/_archive/settled_issues/2026-11-10-content-charter.md) 与
> [producer/verifier 质量环](../../_backlog/issues/2026-11-10-producer-verifier-quality-loop.md) 推演——
> “先想清楚归位、再动手”同样适用于 `docs/`。本 Note 只记这次**形状**调整，不含内容值修正（另卡）。

## 问题

`docs/` 顶层 18 个 markdown 平铺：合同、地图、台账、规范、政策混在一个平面。人扫目录
“无所适从”，agent 用 `glob docs/**/*.md` 也看不出路径的 scope。DSH 自己的 `docs/` 是
“树位置即 scope”：顶层只留架构/测试/术语等跨面门，其余进 `subsystems/`、`cookbook/` 等 tier。

同时，`index.md` 的“现有文档”表把 33 份文档逐份登记，承担了第二本清单的角色；`doc-taxonomy`
门禁强制它。这次不推翻这个存量选择（D28 禁第二清单 vs 本仓的登记表），只让路径自带 scope，
index 首屏按目的路由。

## 决定

1. **树形状**：顶层留 8 个门/宪法——`AGENTS.md`、`index.md`、`orient.md`、`policy.md`、
   `project-map.md`、`repo-hygiene.md`、`runtime-map.md`、`testing.md`；主题合同进
   [`contracts/`](../../docs/contracts/)（7：data-model / delegation / demo / multi-human /
   presets / profile / release）；查表与登记进 [`reference/`](../../docs/reference/)
   （3：decisions / terminology / external-research）；`design/`（4）与 `guides/`（11）不变。
2. **`docs/AGENTS.md` 层表**：新增“参考”行；合同行改为“顶层跨面宪法 + `contracts/`”；合同定义从
   “某子系统”改为“某主题/子系统”（contracts 含 demo/multi-human/release，不是纯子系统）。
3. **`docs/index.md`**：首屏改为“先读（按目的）”5 行；33 行登记表路径全部指向新家；
   `doc-taxonomy` 绿。
4. **站内链接**：227+ 条、104 个源文件跟随；其中 **122 个冻结层文件**（`notes/archived` /
   `_backlog/_archive`）逐文件核为 **HEAD 内容只做 10 条 old→new 路径替换**，0 内容/日期/论断变化。
   非冻结文件的链接改写是相对路径重算。`link-debt` 不升（archived 20 / moved 0 / live 0）。
5. **代码/配置**：16 处引用更新（`ledger-routing`、`dev-product-parity`、`tests/presets`、
   preset 注释等）；无类型/行为改动。
6. **预算**：10 个 `DOC_LINE_BUDGETS` 键更新，未提额；`index.md` 69/72、`docs/AGENTS.md` 60/62
   （贴顶，下一步先搬/压）。
7. **不做 redirect stub**：旧路径不保留 10 个 stub——平铺视觉收益会归零，链接由门禁保证。
8. **提交策略**：用户接受后**一次 commit**（纯路径 + 预算 + 层表/index + 相关代码引用），
   卡与 Note 同提交收口。

## 输掉的方案

- **只改 index**：`ls docs/` 仍然平铺；agent 的 glob 仍看不出 scope；104 个引用继续增长。
- **redirect stub**：旧路径留 10 个 stub 兼容链接；平铺还在，视觉收益归零，且多 10 个需要维护的壳。
- **抬 `link-debt` 基线**：用欠账换整洁，违反棘轮方向；路径可维护，欠账不该升。
- **不搬**：越晚越贵（引用已 104 个文件 / 一次 187 文件 diff）。
- **顺手做内容值修正 / design 并回 notes / index 改成 tier map**：本卡只做形状；这些是下一层
  质量问题，混进来会让 diff 无法按性质审。各自另卡（14 处值修正已列在卡内；design/index 两个大偏离
  另决）。

## 流程问题（必须记）

实现发生在立卡、dry-run、用户点头之前——违反 [policy §P1](../../docs/policy.md)
（feature 任务先 Plan Mode）与五道门“实施前有卡/授权”。纠正：先在工作树冻结，补一张
`等人拍板` 的卡，把范围/验收/审查与 DSH 对齐结论写清；用户 2026-11-10 答复“都提交”= 接受。
**下一次同类结构迁移**：先立卡（范围/验收/抽象度）→ 生成迁移清单 dry-run → 用户点头 → 执行。

## 后果

- 新 agent 的入口链按目的路由；路径自带 scope，`glob` 结果可读。
- `docs/` 的存量内容债更可见：14 处过期计数/路径/旋钮仍在（release patch 计数、runtime-map
  preset 计数、presets browser 角色数、dev-loop 角色数、architecture 255 行/4 preset、ui-demo patch
  数组、bootstrap 角色数、environments“四条”、product-definition 死路径、budget-and-ops maxDepth 等），
  留“docs 值修正”独立卡。
- 四个 DSH 对齐偏离在当时**有意保留**：`design/` 与 Agent Notes 重叠；`index` 仍承担第二本清单；
  行预算不留 5% headroom；文档仍带日期/历史。随后 2026-11-10 的 [DSH 对齐](./2026-11-10-docs-dsh-alignment.md)
  已处理前三个（design→notes、index→tier 书架、doc-budget 5% headroom），now-only 部分处理
  （证据日期保留，DSH 允许 version-specific evidence）；本 Note 记录结构收敛那一层，后续以对齐 Note 为准。

## 验证

真跑（2026-11-10，工作树接受态）：

```sh
pnpm verify    # ALL PASS；2 门无对象（replay-fixture-freshness / replay-ui-freshness）
pnpm test      # 167 files / 1347 tests passed
pnpm typecheck # 通过（无类型/导入面改动）
```

- 冻结层：122 个改动文件逐文件与 HEAD 比对 = 只做 10 条 old→new 路径替换，0 例外；
  `notes-archived-links` 绿。
- `link-debt` 未升（archived 20 / moved 0 / live 0）；`doc-taxonomy` 绿；预算 10 键更新、未提额。
- 迁移清单：`runtime/docs-migration/manifest.json`（gitignored；old→new + 逐条 link edit）。
- 工作树：187 文件（177 M + 10 rename）一次 commit；本 Note 与卡归档同提交。

## 相关

- 后续 DSH 对齐：[docs-dsh-alignment](./2026-11-10-docs-dsh-alignment.md)。
