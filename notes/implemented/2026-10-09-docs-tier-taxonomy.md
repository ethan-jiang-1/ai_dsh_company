# docs/ 分层规矩立家：docs/AGENTS.md + doc-taxonomy 门禁

状态：已消化（2026-10-09；用户令「能修的就修，能补的就补」——本条 = 第二遍深挖 gap N1；机制借 `vendor/dsh/docs/AGENTS.md` 的 tier 表，不是新立法）。

## 问题

`docs/` 有地图（[index.md](../../docs/index.md)），**没有分层规矩的家**。

「哪层放什么」散在两处散文里（index §文档组织原则的表 + 各文件开头自述的「性质：」），而且那张表**只有正向职责、没有反例列**——DSH 的 tier 表每一行都带 "Does NOT belong there"，本仓没有这一半。边界靠读的人自己猜，实测后果：

- **`docs/design/` 长成「动工前的设计决策记录」**（[architecture.md](../../docs/design/architecture.md):8 自述），共 4 份 791 行。这正是 DSH tier 表说**该归 Note** 的那一格：「decision rationale → Agent Notes」「migration plans / acceptance checklists / spec-speak excluded once shipped」。
- **[role-content-plan.md](../../docs/design/role-content-plan.md) 自己声明「已定稿——五角色内容随 R2 全员落地」**——一份已完成的历史叙述留在设计层，而设计层的职责是「仍在指导未来选择的机制依据」。
- **两份 docs 从未登记进 index §现有文档**：`docs/guides/cdp-probe.md`、`runtime-map.md`（后者是顶层合同，还挂在根 AGENTS.md 的入口链上）。登记全靠人记得，没有任何检查。

全仓只有 **2 个** subtree `AGENTS.md`（根 + `company-workspace/`），vendor 有 **11 个**——按目录就近声明规矩的机制本仓基本没用。

## 决定

新建 [docs/AGENTS.md](../../docs/AGENTS.md) 作为 docs/ 分层规矩的**唯一家**，内容按 DSH tier 表补齐**反例半边**：

| 层 | Job | **不属于这层** |
|---|---|---|
| 导航 | 地图 + 台账路由 | 决定正文（→ Note）；主题事实（→ 合同） |
| 设计 | 机制依据与方案取舍 | 现在时语义；实现细节；**已落地的决策叙述** |
| 指南 | 怎么操作 | 机制依据；枚举型清单（D28）；完成定义 |
| 合同 | 现在时语义，随代码同 diff | 历史决策；迁移计划；未来设想 |

外加三节本仓已付过学费的规矩：长度棘轮（上限唯一源在 doc-budget 门禁 checks/gates/doc-budget.mjs 的 DOC_LINE_BUDGETS，**本文件不复述数字**）、更新时机（合同同 diff / **不追加变更史**）、负知识（按时间分目录、集中 INDEX.md、复述枚举清单、行数当完成门槛——四条都是本仓实测踩过的）。

`index.md` 同步去重：那张分层表压成一句指针（「分层规矩唯一家 = docs/AGENTS.md」），生命周期列删除。**一处事实一个家**——规矩住 AGENTS.md，index 只留现状登记。

## 输掉的方案

- **只留 index 里的表、不建 AGENTS.md**：否决。规矩住地图里 = 改地图的人不自觉在改规矩；而且 `docs/AGENTS.md` 是 DSH 的原生载体（会话进 `docs/` 时自动注入），建它是**用现成机制**，不是发明。
- **顺手把 `docs/design/role-content-plan.md` 迁进 `notes/`**：否决（本轮）。它是 94 行的「已定稿」文件，迁它要动 index 登记、presets.md 指针、可能还有别处引用，属于**独立一轮的搬迁**；本轮的交付是「把边界写清楚 + 装门禁」，让**下一个碰它的人**有判据。夹带搬迁会让本轮 diff 混两件事。
- **给 docs 加「每层行预算」**：否决。现有 `DOC_LINE_BUDGETS` 已按文件管；按层再管一遍是第二本账。
- **门禁只查 docs/AGENTS.md 存在**：否决（这是首版的疏漏方向）。只查在场 = 挡不住「把反例列删掉」，而那正是本 gap 的病灶。必须查 `不属于这层` 列在场。

## 验收

- `pnpm verify` 新增 `doc-taxonomy` PASS 行，带「20 份 docs 全登记」计数。
- **红/绿四步**（每条实跑、还原即绿）：
  1. 删 `docs/AGENTS.md` → 红（点名「分层规矩没有家」）→ 还原 → 绿。
  2. 删 tier 表的「不属于这层」列 → 红（「只写正向职责则边界靠猜」）→ 还原 → 绿。
  3. 新建未登记的 `docs/*.md` → 红（点名该文件）→ 还原 → 绿。
  4. 删 `docs/AGENTS.md` 时 `doc-budget` 报「不在盘上」而**不抛异常**（见下）。
- `docs/index.md` 行预算随去重下调（棘轮只降不升）。

## 验证记录（2026-10-09 实施）

| 步 | 实跑命令 | 判据与结果 |
|---|---|---|
| 红 1 | `rm docs/AGENTS.md && node checks/run-gates.mjs` | `FAIL doc-taxonomy: docs/AGENTS.md 缺失——docs/ 分层规矩没有家` → 还原 → 绿 |
| 红 2 | 删表头「不属于这层」 | `FAIL doc-taxonomy: … tier 表缺「不属于这层」列——只写正向职责则边界靠猜` → 还原 → 绿 |
| 红 3 | 新建 `docs/zz-tmp-unregistered.md` | `FAIL doc-taxonomy: 这些 docs/ 文件未在 index.md §现有文档 登记…：zz-tmp-unregistered.md` → 删除 → 绿 |
| 绿 | `pnpm verify` | `PASS doc-taxonomy（分层规矩在场 + 20 份 docs 全登记）`、`verify: ALL PASS` |
| 登记补口 | index §现有文档 +6 行 | `docs/guides/cdp-probe.md` / `runtime-map.md` / `project-map.md` / `orient.md` / `AGENTS.md` 补登（前两份为本轮**实测**的漏登） |
| 棘轮 | `DOC_LINE_BUDGETS` 148→143；新增 `docs/AGENTS.md` 62 | `PASS doc-budget docs/index.md (143/143)`、`PASS doc-budget docs/AGENTS.md (55/62)` |

**红 1 第一次跑没有输出，暴露了一个真 bug（已修）**：`DOC_LINE_BUDGETS` 循环直接 `readFileSync`，
文件缺失时**抛异常中断整个 run-gates**——后面所有门禁一行都不打印，包括本可以报出「规矩没有家」的
`doc-taxonomy`。修法 = 缺失时 `fail('doc-budget', '不在盘上…')` 后 `continue`。红 1 重跑即两行都出。
（这与 D36 的假守卫同源：**门禁的红必须真跑过**——第一次跑出来的可能是「崩了」而不是「红了」。）
