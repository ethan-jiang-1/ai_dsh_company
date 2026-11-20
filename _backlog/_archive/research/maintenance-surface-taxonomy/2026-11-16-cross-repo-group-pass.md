---
topic: maintenance-surface-taxonomy
intent: 用组级分类复跑另两仓，验证「三面」缺口是否本仓特有，并给出可推广的纯度指标
---

# 三仓组级复跑：缺口不是本仓特有，但本仓最小

> 本仓有逐条库存可跑全量（上一轮 116/123）；另两仓没有同口径的公开入口表，所以这一轮按**组**判：一个组里若多数成员的「红了谁动」不同，就记为该组串味。组级结论只用于比较方向，不冒充逐条数据。

## 1. 组级结果

### 本仓（11 组，2 组串味，7 条冲突）

| 组 | face | 判定 |
|---|---|---|
| checks/gates、checks/lanes、checks/audit | judge | 纯 |
| probes 四域 | show | 纯 |
| tools/dev、tools/release | operate | 纯 |
| tools/observe | 6 show + 1 operate | ❌ 串味 |
| tools/repo | 8 operate + 1 judge + 2 非面 | ❌ 串味 |

### `bsimulation`（checks 12 组，5 组串味，约 27/70 件）

| 组 | face | 判定 |
|---|---|---|
| verify / gates / quality / audit / mutants | judge | 纯 |
| release（20 件） | judge（artifact/install/profile-smoke）+ operate（export-dist/dist-refresh/market-index/tag-*/upgrade-*） | ❌ 混装 |
| backlog（5）/ openspec（5）/ build（1）/ evidence（1） | operate | ❌ 住进 checks |
| test（5）/ report（1） | 非面（runner / reporter） | 合规 |

`checks` 名义是 "development gates"，实际 70 件里约 27 件是运维/生成，占 38%。

### `deep_research`（scripts 7 组，2 组串味，约 18/152 件 + 90 件实现）

| 组 | face | 判定 |
|---|---|---|
| verify（8）/ smoke（28）/ run-gates（7） | judge | 纯 |
| test（1）/ lib（90） | 非面（runner / 实现） | 合规（但 lib 占 59%） |
| run-ops（14） | show（watch/session-events/dashboard/诊断/回放/场景）+ judge（run-accept）+ operate（archive） | ❌ 三动词混装 |
| dist（4） | operate（export/market/handoff）+ judge（release-check） | ❌ 混装 |

`run-ops` 名字是 operate，内容却以 show 为主——这是三仓里最深的串味：**名字与动词相反**。

## 2. 结论：94% 是本仓的，不是普遍的

| 仓 | 串味组 | 受影响条目（估） | 主要方向 |
|---|---|---|---|
| 本仓 | 2/11 | 7/123（6%） | show → operate，judge → operate |
| `bsimulation` | 5/17 | ~27/70（39%，仅 checks） | operate → judge |
| `deep_research` | 2/9 | ~18/60（30%，仅 scripts 入口） | show/judge/operate 三向 |

**规律：最大的那个面会吸收邻居。** 本仓最大的是 `checks`（judge，114 件），但它没有吸 show/operate——因为它旁边有独立的 `probes` 和 `tools`；被吸的是 `tools`（operate），它把 show 和 judge 吸了进来。`bsimulation` 与 `deep_research` 没有独立的 operate 面，于是 operate 被吸进 `checks` / `scripts`；`deep_research` 的 `run-ops` 还把 show 吸进了 operate 组。**面越少，串味越重**——这是对"两面够不够"的直接回答：不够。

## 3. 可推广的指标：面纯度

现在三仓都没有"这个目录里有多少件不属于这个动词"的量化。建议加一条 census 派生指标（不进硬门禁，先观察）：

> **面纯度** = 该顶点目录下，face 与目录动词一致的条目数 / 该目录条目总数。低于 80% 即列为"待收敛"。

按本轮估算：本仓 `tools` = 18/25 = 72%（待收敛）；`bsimulation` `checks` = 43/70 = 61%；`deep_research` `scripts` = 42/60 = 70%。三个仓都过不了 80%，说明这不是某一仓的卫生问题，是**分类法缺一个可观测的收敛指标**。纯度只做观察、不做硬门禁，避免又造一条"为指标服务"的棘轮（上一轮 P2 的教训）。

## 4. 这一轮的方法边界

- 另两仓没有逐条公开入口表，组内文件按 README 的职责描述归类，未逐文件读头注；`run-ops` 的 show 判定基于 README 的"只读投影 / 诊断 / 回放"描述。
- `bsimulation` 的 checks/release（bsim） 我按 5 judge + 15 operate 估；精确比例要逐文件读，下一轮如需要可只读补。
- `deep_research` 的 90 件 `lib` 不计入面纯度分母（它是实现层，不是入口），所以 42/60 的分母是"非 lib 入口"。

## 5. 下一轮

1. 本仓最小迁移草案（目录树 + 逐文件 `git mv` + 引用替换 + 重生成 + 回滚），本轮已在 [2026-11-16-migration-draft.md](2026-11-16-migration-draft.md) 起草。
2. 面纯度指标要不要进 census：先做观察行，还是直接进 `test-census.spec` 的软断言？——需要用户裁一次。
3. 把"最大面吸收邻居"写成规则的一条预警：新增面时先问"它会不会成为最大面、会不会吸邻居"。
