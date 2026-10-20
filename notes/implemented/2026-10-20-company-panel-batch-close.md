# 公司面板批次收尾：六张卡 + 四个收敛 + 一个真红（2026-10-20）

状态：implemented（2026-10-20；2026-10-19/20 公司面板批次收口；不是新决定，是句号与现状）

## 句号覆盖了什么

2026-10-19/20 的六张卡全部有结论并归档：

- [issue 卡质量（A 收口）](../../_backlog/_archive/settled_issues/2026-10-19-issue-card-quality.md)：A 已执行；B（Card v2）触发复核未发生，维持以后做；C = 执行协议。
- [公司面优先级](../../_backlog/_archive/settled_issues/2026-10-19-company-panels-ux-priority.md)：拍「看板 → 任务板 → 台账」；成品台账拆出。
- [看板 + 依赖图](../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)：新鲜度文案、DAG 徽章、真 21 节点复看（宽图只横向，无纵向双滚动）。
- [任务板](../../_backlog/_archive/settled_issues/2026-10-19-taskboard-table-ux-deep-dive.md)：依赖列 `owner · subject`、入口探针。
- [台账](../../_backlog/_archive/settled_issues/2026-10-19-ledger-ux-deep-dive.md)：40 行/全文入口/30s/人读接受（收口时的数）。
- [成品台账](../../_backlog/_archive/settled_issues/2026-10-19-deliverables-ledger.md)：生成索引 + 第 9 页签「成品」+ `present` 状态 + `converge` 自动重建。

关键 Note：[成品目录](2026-10-19-deliverables-catalog.md)、[新鲜度 + DAG 徽章](2026-10-19-company-panel-freshness-and-dag-badge.md)、[任务板依赖](2026-10-19-taskboard-dependency-labels.md)。决策行 = [D44](../../docs/index.md)。

## 这次清理（2026-10-20）

1. **收敛四个已闭合动议**：`ai-transformation-2026-v2`、`ai-coding-security-2026-v3`、`lingang-recon`、`role-kit-2026`。每个都走 dry-run → 真收敛 → `--charter-backfill`；交付物进归档家、journal 进 `snapshots/archive/convergence-2026-10-20/`、台账行/CHARTER 登记完。
2. **成品目录数字**：44 份 = **活跃 1 / 归档 43 / 台账外 2**；present **42 / 未 present 2 / 未核 0**；台账 **43 行 / 42 ✅**。
3. **role-kit 类型修正**：`类型: 执行` → `生产`（合法词表 = 决策/生产/诊断/口径问答）；审计对应的 `meta-shape-bad` 消失。
4. **收敛就绪误判修复**：旧 `concl.includes('回填')` 把 v2 真结论里提到的「未回填」当成占位，导致 v2 被计划档判「未备」。新增 `isPlaceholderConclusion`（只认整值占位），v2 由「未备」变「可收敛」；键盘可跑，spec 见 `tests/company/converge-rules.spec.ts`。
5. **自动重建真跑**：四件收敛每次都由 `converge` 自动重建索引，活跃数 5→4→3→2→1；不再只靠 `--rebuild-index` 单点验证。

## 只剩什么（不藏）

- **private-deploy-reserve-2026 的 `final-not-presented` 是真红**：盘上有 final、meta 闭合，但没有任何 Lead `present` 事件。`deliverables-check --json` 只报这一条违规。这是公司动作（要 Lead 真 present），维护侧**不伪造 present、不用 `--allow-open-findings` 把它藏进归档**；「成品」页签显示「未 present」。
- **recon-pack 归档旧件未 present**：审计只作 legacy 观察项；历史件，不补。
- **light / hefeng 未闭合**：`meta.closed` 为空，收敛计划明确「未备」；不硬关。
- **边界**：成品目录是静态索引 + 重读，不实时订阅；`replay-smoke --ui` 未跑（真 app 探针覆盖页签）；任务板窄栏折叠、台账日期分组/筛选是未开的可选功能，不是本轮 todo。

## 证据

- `pnpm verify` ⇒ **ALL PASS**；`pnpm test` ⇒ **70 files / 693 tests**。
- `client-load-smoke` ⇒ **ALL PASS**。
- `deliverables-check --json` ⇒ 1 违规（private-deploy）；42/44 present；`role-kit` 0 违规。
- 四件收敛 + backfill 的日志在 `/tmp/converge-*.log` / `/tmp/backfill-*.log`；证据副本 `snapshots/archive/convergence-2026-10-20/`。
- 成品目录真 app 探针 `deliverables-catalog-probe` ⇒ ALL PASS（44 行、present 统计、打开 final、窄栏）。
- 真 21 节点 DAG `dag-midflight-probe --session session-133c5cde… --narrow` ⇒ 1716×321、390 窄栏只横向滚动。

## 不要再重开的事

- 不要为「993 份成品」再开卡（那是文件数；final 44）。
- 不要把 private-deploy 的 present 用维护脚本补（那是伪造公司动作；要真 Lead present）。
- 不要把成品目录改成实时 Remote / 新建第二份手写清单（D44/D28 已判）。
- 不要为 B（Card v2）扩结构——触发复核未发生。
