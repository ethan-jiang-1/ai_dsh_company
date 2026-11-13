# 测试资产盘子（生成物，勿手改）

> 生成 = `node tools/test-census.mjs --write`；一致性门 = `tests/repo/test-census.spec.ts`（不一致即红）。
> 数据源 = `tools/lib/asset-lanes.mjs`（登记 + lane）+ 盘上目录计数；失败类词表 = `tests/failure-classes.md`。

## 汇总

| 指标 | 数量 |
|---|---|
| 冒烟 | 32 |
| 探针 | 69 |
| 结构门禁 | 71 |
| keyless spec 文件 | 246 |
| fast lane | 6 |
| surface lane | 7 |
| weekly lane | 22 |
| 未分类失败类 | 69 |

## 失败类分布

| 失败类 | 资产数 |
|---|---|
| 未分类 | 69 |
| 配置组合 | 10 |
| 模型可见文本 | 5 |
| client UI | 4 |
| 会话持久化 | 3 |
| 子进程并发 | 3 |
| 工具定义 | 2 |
| 纯逻辑 | 2 |
| 导出形态 | 1 |
| 文档指针 | 1 |
| 注册生命周期 | 1 |

## 冒烟

| 资产 | kind | lane | 失败类 |
|---|---|---|---|
| workflow-contract-smoke | classic | fast + surface + weekly | 工具定义 |
| present-catalog-smoke | classic | fast + surface + weekly | 会话持久化 |
| company-root-process-smoke | classic | fast + surface + weekly | 子进程并发 |
| gates-negative-smoke | classic | fast + surface + weekly | 纯逻辑 |
| snapshot-motion-smoke | classic | fast + weekly | 会话持久化 |
| two-axis-gates-smoke | classic | fast + weekly | 配置组合 |
| client-load-smoke | browser | surface + weekly | client UI |
| preset-smoke | classic | surface + weekly | 配置组合 |
| replay-smoke | classic | surface + weekly | 会话持久化 |
| company-entry-smoke | classic | weekly | 配置组合 |
| concurrent-home-smoke | classic | weekly | 子进程并发 |
| external-workspace-smoke | classic | weekly | 子进程并发 |
| interrupted-install-smoke | classic | weekly | 配置组合 |
| isolation-matrix-smoke | classic | weekly | 配置组合 |
| multi-install-smoke | classic | weekly | 配置组合 |
| permissions-recovery-smoke | classic | weekly | 配置组合 |
| profile-row-smoke | classic | weekly | 配置组合 |
| revoke-recovery-smoke | classic | weekly | 注册生命周期 |
| upgrade-while-running-smoke | classic | weekly | 配置组合 |
| client-error-chain-smoke | browser | weekly | client UI |
| multi-window-banner-smoke | browser | weekly | client UI |
| ui-scene-smoke | browser | weekly | client UI |
| channel-matrix-smoke | browser | 手动（要真实全局 dsh + 网络 + 已导出 _dist；发布前手动跑 --channel all） | 配置组合 |
| release-smoke | classic | 手动（分钟级构建 + pack；由 release --verify 调度，不进每周 sweep） | 导出形态 |
| refactor-drift-oracle | tool | 手动（需重构前后成对调用并传清单参数，不是自跑检查） | 纯逻辑 |
| probe-smoke | model | 手动（真模型档（连通 ~6s / 内容 --full 5–10min），按内容改动触发） | 模型可见文本 |
| delegation-smoke | model | 手动（真模型 1 条 prompt（升 pin 或委托边界改动时）） | 工具定义 |
| presence-e2e-smoke | model | 手动（真模型 ~$1，按在场/协作面验收触发） | 模型可见文本 |
| product-team-e2e-smoke | model | 手动（真模型 ~$1，按组队/判据面验收触发） | 模型可见文本 |
| attention-e2e-smoke | model | 手动（真模型 + 多用户并发 lane，人工在场时跑） | 模型可见文本 |
| human-loop-e2e-smoke | model | 手动（真模型 + 真浏览器 ~$1–2，人工在场时跑） | 模型可见文本 |
| entry-probe-smoke | model | 手动（真模型认证档；入口链文档改动后手动跑） | 文档指针 |

## 探针（调试面，不进自动 lane）

| 资产 | 域 | 失败类 |
|---|---|---|
| attention-panel-probe | browser-visual | 未分类 |
| board-drift-probe | browser-visual | 未分类 |
| browser-behavior-probe | browser-visual | 未分类 |
| budget-panel-probe | browser-visual | 未分类 |
| cdp-probe | browser-visual | 未分类 |
| compact-view-probe | browser-visual | 未分类 |
| cultivation-main-e2e | browser-visual | 未分类 |
| cultivation-ux-scenarios | browser-visual | 未分类 |
| cultivation-ux-walkthrough | browser-visual | 未分类 |
| dag-midflight-probe | browser-visual | 未分类 |
| dag-visual-probe | browser-visual | 未分类 |
| deliverables-catalog-probe | browser-visual | 未分类 |
| ledger-summary-probe | browser-visual | 未分类 |
| open-in-app-probe | browser-visual | 未分类 |
| presence-panel-probe | browser-visual | 未分类 |
| sidebar-role-mark-probe | browser-visual | 未分类 |
| tasks-panel-probe | browser-visual | 未分类 |
| collaboration-oracle-probe | fs-taskboard | 未分类 |
| converge-e2e-probe | fs-taskboard | 未分类 |
| cross-process-fs-probe | fs-taskboard | 未分类 |
| fs-guard-probe | fs-taskboard | 未分类 |
| motion-taskboard-probe | fs-taskboard | 未分类 |
| observed-write-conflict-probe | fs-taskboard | 未分类 |
| review-staleness-probe | fs-taskboard | 未分类 |
| task-discovery-probe | fs-taskboard | 未分类 |
| taskboard-presence-probe | fs-taskboard | 未分类 |
| taskboard-scope-probe | fs-taskboard | 未分类 |
| ask-user-timed-probe | session-context | 未分类 |
| budget-signoff-probe | session-context | 未分类 |
| ceo-assembly-probe | session-context | 未分类 |
| cultivation-context-probe | session-context | 未分类 |
| cultivation-method-layer-probe | session-context | 未分类 |
| cultivation-propose-probe | session-context | 未分类 |
| date-rule-probe | session-context | 未分类 |
| dual-ceo-probe | session-context | 未分类 |
| dual-signoff-probe | session-context | 未分类 |
| hitl-dispatch-order-probe | session-context | 未分类 |
| human-exits-expression-probe | session-context | 未分类 |
| human-exits-nonblocking-probe | session-context | 未分类 |
| human-exits-probe | session-context | 未分类 |
| journal-boundary-probe | session-context | 未分类 |
| member-bounceback-probe | session-context | 未分类 |
| reconcile-round-probe | session-context | 未分类 |
| team-taskbook-probe | session-context | 未分类 |
| time-context-probe | session-context | 未分类 |
| claim-race-probe | team | 未分类 |
| delegation-contract-probe | team | 未分类 |
| delegation-depth-probe | team | 未分类 |
| delegation-lifecycle-probe | team | 未分类 |
| dissent-preservation-probe | team | 未分类 |
| member-inquiry-probe | team | 未分类 |
| member-interrupt-probe | team | 未分类 |
| member-reject-in-team-probe | team | 未分类 |
| member-rescue-probe | team | 未分类 |
| member-stale-write-probe | team | 未分类 |
| multi-user-e2e-probe | team | 未分类 |
| quality-loop-audit | team | 未分类 |
| quality-loop-r2-probe | team | 未分类 |
| index | team | 未分类 |
| subagent-retry-probe | team | 未分类 |
| team-atomicity-probe | team | 未分类 |
| team-claim-loser-probe | team | 未分类 |
| team-concurrency-probe | team | 未分类 |
| team-recovery-probe | team | 未分类 |
| vp-eng-root-lead-probe | team | 未分类 |
| vp-eng-teaming-probe | team | 未分类 |
| vp-eng-workflow-probe | team | 未分类 |
| worker-orchestrator-probe | team | 未分类 |
| worker-researcher-probe | team | 未分类 |
