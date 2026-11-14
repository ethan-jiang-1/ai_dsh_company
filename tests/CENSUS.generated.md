# 测试资产盘子（生成物，勿手改）

> 生成 = `node tools/test-census.mjs --write`；一致性门 = `tests/repo/test-census.spec.ts`（不一致即红）。
> 数据源 = `tools/lib/asset-lanes.mjs`（登记 + lane）+ 盘上目录计数；失败类词表 = `tests/failure-classes.md`。

## 汇总

| 指标 | 数量 |
|---|---|
| 冒烟 | 30 |
| 探针 | 59 |
| 结构门禁 | 75 |
| keyless spec 文件 | 244 |
| fast lane | 4 |
| surface lane | 6 |
| weekly lane | 21 |
| 未分类失败类 | 0 |
| 无消费者资产 | 50 |

## 失败类分布

| 失败类 | 资产数 |
|---|---|
| 模型可见文本 | 22 |
| 配置组合 | 19 |
| client UI | 18 |
| 子进程并发 | 10 |
| 会话持久化 | 8 |
| 工具定义 | 5 |
| 注册生命周期 | 3 |
| 文档指针 | 2 |
| 导出形态 | 1 |
| 纯逻辑 | 1 |

## 字段（v2）

`shape` = example | generator | model | meta（当前默认 example）；`lastRed` = 最近一次真红日期（— = 未接运行日志，不伪造）；`replaceBy` / `retireWhen` = 替代资产 / 退役条件（— = 未排期）。`消费者` = 自动调度 lane 数 + tests/checks/tools/probes/run 里引用该资产名的文件数。

## 冒烟

| 资产 | kind | lane | 失败类 | shape | 消费者 |
|---|---|---|---|---|---|
| workflow-contract | classic | fast + surface + weekly | 工具定义 | example | 3 |
| present-catalog | classic | fast + surface + weekly | 会话持久化 | example | 4 |
| company-root-process | classic | fast + surface + weekly | 子进程并发 | example | 3 |
| snapshot-motion | classic | fast + weekly | 会话持久化 | example | 2 |
| client-load | browser | surface + weekly | client UI | example | 6 |
| preset | classic | surface + weekly | 配置组合 | example | 8 |
| replay | classic | surface + weekly | 会话持久化 | example | 9 |
| company-entry | classic | weekly | 配置组合 | example | 2 |
| concurrent-home | classic | weekly | 子进程并发 | example | 1 |
| external-workspace | classic | weekly | 子进程并发 | example | 1 |
| interrupted-install | classic | weekly | 配置组合 | example | 1 |
| isolation-matrix | classic | weekly | 配置组合 | example | 1 |
| multi-install | classic | weekly | 配置组合 | example | 1 |
| permissions-recovery | classic | weekly | 配置组合 | example | 1 |
| profile-row | classic | weekly | 配置组合 | example | 1 |
| revoke-recovery | classic | weekly | 注册生命周期 | example | 1 |
| upgrade-while-running | classic | weekly | 配置组合 | example | 1 |
| client-error-chain | browser | weekly | client UI | example | 1 |
| multi-window-banner | browser | weekly | client UI | example | 1 |
| ui-scene | browser | weekly | client UI | example | 6 |
| channel-matrix | browser | 手动（要真实全局 dsh + 网络 + 已导出 _dist；发布前手动跑 --channel all） | 配置组合 | example | 1 |
| release | classic | 手动（分钟级构建 + pack；由 release --verify 调度，不进每周 sweep） | 导出形态 | example | 6 |
| probe | model | 手动（真模型档（连通 ~6s / 内容 --full 5–10min），按内容改动触发） | 模型可见文本 | example | 4 |
| delegation | model | 手动（真模型 1 条 prompt（升 pin 或委托边界改动时）） | 工具定义 | example | 3 |
| presence-e2e | model | 手动（真模型 ~$1，按在场/协作面验收触发） | 模型可见文本 | example | 0 |
| product-team-e2e | model | 手动（真模型 ~$1，按组队/判据面验收触发） | 模型可见文本 | example | 0 |
| attention-e2e | model | 手动（真模型 + 多用户并发 lane，人工在场时跑） | 模型可见文本 | example | 0 |
| human-loop-e2e | model | 手动（真模型 + 真浏览器 ~$1–2，人工在场时跑） | 模型可见文本 | example | 0 |
| entry-probe | model | 手动（真模型认证档；入口链文档改动后手动跑） | 文档指针 | example | 0 |
| generative | classic | weekly | 文档指针 | generator | 2 |

## 探针（调试面，不进自动 lane）

| 资产 | 域 | 失败类 | shape | 消费者 |
|---|---|---|---|---|
| attention-panel-probe | browser-visual | client UI | example | 0 |
| board-drift-probe | browser-visual | client UI | example | 2 |
| browser-behavior-probe | browser-visual | client UI | example | 0 |
| budget-panel-probe | browser-visual | client UI | example | 0 |
| cdp-probe | browser-visual | client UI | example | 4 |
| cultivation-ux-scenarios-probe | browser-visual | client UI | example | 0 |
| cultivation-ux-walkthrough-probe | browser-visual | client UI | example | 1 |
| dag-midflight-probe | browser-visual | client UI | example | 0 |
| dag-visual-probe | browser-visual | client UI | example | 2 |
| deliverables-catalog-probe | browser-visual | client UI | example | 1 |
| ledger-summary-probe | browser-visual | client UI | example | 1 |
| presence-panel-probe | browser-visual | client UI | example | 0 |
| sidebar-role-mark-probe | browser-visual | client UI | example | 2 |
| tasks-panel-probe | browser-visual | client UI | example | 0 |
| collaboration-oracle-probe | fs-taskboard | 纯逻辑 | example | 0 |
| converge-e2e-probe | fs-taskboard | 会话持久化 | example | 1 |
| cross-process-fs-probe | fs-taskboard | 子进程并发 | example | 1 |
| fs-guard-probe | fs-taskboard | 工具定义 | example | 1 |
| motion-taskboard-probe | fs-taskboard | 模型可见文本 | example | 0 |
| observed-write-conflict-probe | fs-taskboard | 子进程并发 | example | 0 |
| review-staleness-probe | fs-taskboard | 模型可见文本 | example | 0 |
| task-discovery-probe | fs-taskboard | 模型可见文本 | example | 0 |
| taskboard-presence-probe | fs-taskboard | 会话持久化 | example | 0 |
| taskboard-scope-probe | fs-taskboard | 会话持久化 | example | 1 |
| ask-user-timed-probe | session-context | 配置组合 | example | 0 |
| budget-signoff-probe | session-context | 模型可见文本 | example | 0 |
| ceo-assembly-probe | session-context | 模型可见文本 | example | 0 |
| cultivation-context-probe | session-context | 会话持久化 | example | 0 |
| cultivation-method-layer-probe | session-context | 配置组合 | example | 1 |
| date-rule-probe | session-context | 模型可见文本 | example | 0 |
| dual-ceo-probe | session-context | 配置组合 | example | 0 |
| dual-signoff-probe | session-context | 模型可见文本 | example | 0 |
| hitl-dispatch-order-probe | session-context | 模型可见文本 | example | 0 |
| human-exits-probe | session-context | 模型可见文本 | example | 0 |
| journal-boundary-probe | session-context | 模型可见文本 | example | 0 |
| member-bounceback-probe | session-context | 模型可见文本 | example | 0 |
| reconcile-round-probe | session-context | 模型可见文本 | example | 0 |
| team-taskbook-probe | session-context | 模型可见文本 | example | 0 |
| time-context-probe | session-context | 配置组合 | example | 0 |
| claim-race-probe | team | 子进程并发 | example | 0 |
| delegation-contract-probe | team | 配置组合 | example | 0 |
| delegation-depth-probe | team | 配置组合 | example | 0 |
| delegation-lifecycle-probe | team | 注册生命周期 | example | 0 |
| dissent-preservation-probe | team | 模型可见文本 | example | 0 |
| member-inquiry-probe | team | 工具定义 | example | 0 |
| member-interrupt-probe | team | 注册生命周期 | example | 0 |
| member-reject-in-team-probe | team | 模型可见文本 | example | 0 |
| member-rescue-probe | team | 模型可见文本 | example | 0 |
| member-stale-write-probe | team | 子进程并发 | example | 0 |
| multi-user-e2e-probe | team | 配置组合 | example | 0 |
| quality-loop-r2-probe | team | 模型可见文本 | example | 0 |
| subagent-retry-probe | team | 工具定义 | example | 0 |
| team-atomicity-probe | team | 子进程并发 | example | 1 |
| team-claim-loser-probe | team | 子进程并发 | example | 1 |
| team-concurrency-probe | team | 子进程并发 | example | 0 |
| team-recovery-probe | team | 会话持久化 | example | 0 |
| vp-eng-workflow-probe | team | 配置组合 | example | 0 |
| worker-orchestrator-probe | team | 配置组合 | example | 0 |
| worker-researcher-probe | team | 配置组合 | example | 0 |
