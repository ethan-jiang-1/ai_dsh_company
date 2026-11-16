---
topic: maintenance-surface-taxonomy
intent: 独立盲审的 19 条发现、采纳/驳回与由此产生的规则修订；给三份 handoff 提供反例来源
---

# 盲审记录：19 条反例与规则修订

> 方法：一个无历史上下文的只读子代理，读三仓 + 本题材料，任务 = 找出至少 5 个误分类、3 个真歧义、攻三面模型、检查 P0 可行性、检查改名可行性。它没有写任何文件。以下按"采纳 / 改写 / 驳回"处理。

## 1. 直接采纳（改了模型或 handoff）

| # | 发现 | 处理 |
|---|---|---|
| 12 | 缺**生命周期**轴：`状态：已耗` 的条目仍被算成面 | 规则加前置轴：已耗 → 非面/归档；本仓 `candidate-scan-eval` 改列非面 |
| 13 | `operate` 混了 run 与 act | 保留一个面，但加**模式**：run（可重试）/ act（可能半途，需 converge）；`tools/dev` 与 `dev/` 是 run 组 |
| 2 | `bsimulation` 的 checks 约 47/79 不是 judge | bsim handoff 改写：checks = **mixed（待拆）**，不许写"judge + 5 例外" |
| 8 | bsim checks/release 半 judge 半 act | 例外表按件拆，不再整组贴一个面 |
| 3 | dr probes/_index.mjs 是生成器 + 门禁守卫 | 归**非面（生成器）**，跟 probes 消费者住 |
| 4 | dr `stream/llm-stream-tee.cjs` 是预载驱动，永不判红 | 归**非面（驱动）** |
| 14 | 本仓 `AGENTS.md` 83/84，P0 加三行会撞 doc-budget | P0 改为**替换不加行**；合同另立 docs/surface-contract.md |
| 15 | 合同写了另两仓不存在的目录名 | 合同改为**面优先**；现状名与目标名分列，P0 不改名 |
| 18/19 | `dev/`→`tools/dev/`、`scripts/`→`checks/` 会打断 gate 输入、hooksPath、注入面与 3093 处引用 | **撤回"必须改名"**；改名降为独立项目，handoff 写风险清单 |
| 7 | lane runner 被 CSV 记成 judge | runner = **非面**；`fast-lane`/`keyless-lane` 改列非面，仍住 `checks/lanes` |
| 9 | `session-log-export` 用"失败要重跑"判 operate，测试是空的 | 改用**产物**判：导出的是证据 → **show**；`tools/observe` 7 件全 show |
| 10 | `terms.mjs` / `dist-cleanup` 这类 support 模块无处安放 | 非面清单加 **support / 数据 / 查询**；跟消费者住 |

## 2. 改写后采纳（结论不同）

| # | 发现 | 处理 |
|---|---|---|
| 1 | bsim probes/e2e/acceptance-setup.mjs 会改世界，应 operate | 它是**探针的 helper/fixture**，不是独立面；归非面（fixture），并把它从探针计数里摘出。**"会改世界"不足以让它成面——fixture 也会改。** |
| 6 | 本仓 `snapshot-path.mjs` 应 operate | 它是**纯查询**，不改世界也不出裁决；归非面（查询）。非面清单补"查询"一类。 |
| 11 | `cdp-probe` 被 `ui-scene` 调度，阈值一改 gate 就变，应 judge | 记为**依赖**而非换面：`cdp-probe` 仍是 show；`ui-scene` 是 judge，在头注登记"判据依赖 cdp-probe 的断言"。换面会让手动用途失去家。 |
| 5 | `candidate-scan-eval` 已耗仍被判 judge | 与 #12 合并：已耗 = 非面；CSV 已改，旧材料保留日期并加更正指针。 |

## 3. 未解决（留给各仓决定）
1. bsim `checks/audit`：迁 probes/analyze（扩 probes 口径）还是把默认改成 exit 1（变 judge）？两条都会改行为/口径。
2. dr `probes` 是否接受 9 件 run-ops show 迁入（探针六字段 + 索引重生成 + 口径扩大）。
3. 本仓 `MAX_PROBES` 59 → 66（A）还是同批退役 7 支（B）。
4. dr 的 `scripts/` 是否值得做 161 文件改名项目；本 handoff 的建议是**不做**。

## 4. 这次盲审改变了什么（一句话）
**从"三面 + 改名"改成"三面 + 两个前置轴 + 先声明后搬家"**；最重要的不是多知道了几个例外，而是承认**目录改名不是清晰度的前提**——面声明与例外表就能让 fresh agent 不按名字猜。
