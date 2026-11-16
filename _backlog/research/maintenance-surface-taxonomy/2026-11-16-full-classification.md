---
topic: maintenance-surface-taxonomy
intent: 126 条入口的全量判定结果、7 个冲突，以及三面迁移撞上 P2 探针棘轮的具体约束与选项
---

> **状态：过程材料。** 全量分类报告（盲审前口径）；candidate-scan-eval 已改列非面、session-log-export 已改判 show，最终判定以 reorg-company §2 为准。

# 全量分类：116/123，以及迁移撞上的 P2 棘轮

> **后续更正（同日）**：`candidate-scan-eval.mjs` 状态 = 已耗，已改列非面（活条目 122）；`bsimulation` 的 `checks/audit` 复核为 show。以 [unified-surface-scheme](2026-11-16-unified-surface-scheme.md) §10 为准。

> 上一轮用 29 条难例测出 66% 一致；这一轮把本仓 126 个公开入口全量过一遍，并把「迁移到底要付什么」算到文件级。数据 = [2026-11-16-full-classification.csv](2026-11-16-full-classification.csv)（逐条 path / kind / face / 现址 / 是否一致 / 备注）。

## 1. 口径

- 总数 126 = `checks/lanes` 32 + `checks/audit` 7 + `probes` 60 + `tools` 27（与 `checks/INDEX.generated.md` 一致）。
- 60 个"探针"里含 1 个 fixture 入口（`probes/team/read-barrier/index.mjs`），不是证据资产。
- 另有 2 个**非面**条目：`tools/repo/run-check-tests.mjs`（runner）、`tools/repo/snapshot-path.mjs`（查询工具）。按判定程序的守卫 2，它们不算面。
- 所以可判定 = 126 − 3 = 123；`face` 用上一轮的 judge / show / operate。

## 2. 结果

| face | 数量 | 现址一致 | 冲突 |
|---|---|---|---|
| judge | 40（lanes 32 + audit 7 + refactor-drift 1） | 39 | 1 |
| show | 65（probes 59 + tools/observe 6） | 59 | 6 |
| operate | 18 | 18 | 0 |
| 非面 | 3 | — | — |

**116/123 = 94.3% 一致。** 7 个冲突全部落在 `tools/`：

1–6. `tools/observe/{ask-latency,diagnose,explore-evidence,notes-audit,orient,propose-sampler}` —— show 挂在 operate 面。
7. `tools/repo/refactor-drift.mjs` —— judge 挂在 operate 面。

另有一处**库存口径缺陷**（不算 face 冲突）：`read-barrier/index.mjs` 被 `INDEX.generated.md` 当第 60 个探针计数，而 `CENSUS` 按注册表数 59。上一轮说的 60 vs 59 到此坐实。

**为什么抽样 66%、全量 94%**：抽样挑的是难例（audit / observe / 双模件），全量里绝大多数是同质的 lane 与 probe。结论不是"规则很准"，而是——**规则的难点高度集中在一个组（`tools/observe`）和一个文件（`refactor-drift`）**，不是弥散在全仓。这对迁移是好消息：改动面小且可枚举。

## 3. 迁移撞上的 P2 棘轮（关键约束）

把 6 件 show 迁进 `probes/`，按现行门禁要同时满足四件事：

1. 命名契约：`probes/**` 只许 `*-probe.mjs`（fixture 入口例外）⇒ 6 个文件要改名。
2. 注册：`test-census.spec.ts` 硬性要求 `probes/**/*-probe.mjs` **每一个都登记**，且 `PROBES.length ≤ MAX_PROBES`。
3. 失败类：每个新登记项要有非空 `failureClass`，否则 census 红。
4. 库存：重生成 `CENSUS.generated.md`、`INDEX.generated.md`。

而 `MAX_PROBES = 59`（`tests/repo/budget/test-census.spec.ts:16`），当前正好 59。**迁 6 件 = 65 > 59，必红。** 这不是分类法错，是预算口径与目录绑死：P2 的棘轮数的是"目录里的探针"，不是"新增的观察能力"。

四个选项：

| 选项 | 做法 | 代价 | 评价 |
|---|---|---|---|
| A 一次性抬顶 | `MAX_PROBES` 59 → 65，同 diff 写 Note，用户批准 | 破一次"只降不升"，需明确授权 | **最诚实**：移动不是新增，棘轮应数能力不数门牌 |
| B 同批退役 6 支 | 合并/删除同族探针（claim-race / team-claim-loser / team-concurrency 一类） | 要另做证据与合并，风险大 | 方向对，但不该塞进分类法迁移 |
| C 留在 tools 并登记例外 | `tools/observe` 作为 show  annex，文档写明 | 零迁移，边界继续脏 | 最省事，但等于承认规则管不了这一组 |
| D 重新定义 show | 把日志分析器算 operate（产物 = 报告） | 不撞棘轮 | 与"红了谁动"矛盾：orient/diagnose 不改变世界 |

**建议 A**，并把 P2 的口径改成"**新增探针能力**"而非"目录计数"：迁移/改名不占预算，新增才占。这样分类法可以自由收敛，预算仍然封顶。B 可作为下一轮独立清理，不与本次迁移捆绑。

## 4. 迁移面（文件级）

| 动作 | 文件 | 引用面 |
|---|---|---|
| 6 件迁 probes/analyze（拟建）+ 改名 -probe | `tools/observe/` 6 个 .mjs | `package.json` 3 条脚本（orient / notes:audit / diagnose）、`checks/README.md` 3 处、2 篇 implemented Note、`tests/support/coverage-baseline.json` 1 条 reason、`tools/lib/{orient,session-evidence}.mjs` 2 处注释 |
| `refactor-drift` 迁 `checks/audit/` | 1 个 .mjs | 头注自述、可能的文档引用（待数） |
| `session-log-export` 留在 `tools/`、离开 observe 组 | 1 个 .mjs | `tools/README.md` 组表、可能的 Note 引用 |
| fixture 从探针计数摘出 | `checks-index` 的扫描规则或 `INDEX` 渲染 | 1 个生成器 + 重生成 |
| 注册表 +6、失败类 +6、census 重生成 | `tools/lib/asset-lanes.mjs`、`tests/CENSUS.generated.md` | 与 A/B 决策绑定 |

净搬家 ≈ 8 个文件，引用 ≈ 10 个文件 + 2 份生成物。比 2026-10-07 顶层化的 ~350 处小两个数量级，因为 `tools/observe` 不在 lane 注册表里、也没有脚本互相 spawn。

## 5. 这一轮暴露的设计教训

**预算桶不能等于目录。** 只要棘轮数"某个目录里的条目数"，任何分类法收敛都会撞预算，最后逼出两种坏结果：要么不改目录（边界继续脏），要么为改目录去删真资产（为指标服务）。可迁移的写法是把预算挂在"**已登记能力**"上：登记表是唯一账本，目录只是它的投影；改名/搬家不动账本，新增才动。这条可以推广到 `checks/gates` 的 75 门禁上限（同理：并门禁可以，搬家不该算新增）。

## 6. 下一轮

1. 写一份**最小迁移草案**（目录树 + 逐文件 `git mv` + 引用替换清单 + 重生成命令），仍不动手；把 A/B 决策做成待用户拍板的一项。
2. 用同一份全量法跑 `bsimulation` 与 `deep_research`（只读），看 94% 这个数是不是本仓特有；若是，说明"三面"在另两仓的缺口比本仓大。
3. 若用户批准 A，再评估是否把 `probes/` 的第二层改成 boot 与 analyze 两个组（机制域 vs 数据源），还是维持四域 + 一个 `analyze/`。
