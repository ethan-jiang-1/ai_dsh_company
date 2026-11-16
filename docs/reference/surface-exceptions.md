# 维护面例外登记

> 什么时候读：某个入口不在目录默认面上（`checks/` judge · `probes/` show · `tools/` operate），或想知道「为什么它不算面」时。
> 规则与判定顺序 = [surface-contract](../surface-contract.md)；本页只登记，不重述规则。例外只在本表出现一次；新增/撤离同 diff 改这里。

| 路径 | 面 | 理由 |
|---|---|---|
| `tools/observe/orient.mjs` | show | 只读运行态全景；exit 0，不拦人。 |
| `tools/observe/diagnose.mjs` | show | 失败摘要给人看；`--strict` 是可选裁决，不改身份。 |
| `tools/observe/explore-evidence.mjs` | show | 会话证据包导出，产物是证据。 |
| `tools/observe/notes-audit.mjs` | show | 只读工作表；`--strict` 同上。 |
| `tools/observe/ask-latency.mjs` | show | 延迟分布报数，不裁决。 |
| `tools/observe/propose-sampler.mjs` | show | 自发提案分箱取样。 |
| `tools/observe/session-log-export.mjs` | show | 导出明文日志 = 证据（按产物判，不按「失败要重跑」判）。 |
| `tools/repo/refactor-drift.mjs` | judge | 零漂移裁决，exit 1 = 退回重构。 |
| `checks/audit/candidate-scan-eval.mjs` | 非面（已耗） | 头注 `状态：已耗（2026-11-13 语料已移出本仓）`；缺语料 exit 2。 |
| `checks/lanes/fast-lane.mjs` | 非面（runner） | 只调度 FAST 4 条，自身不证明行为。 |
| `checks/lanes/keyless-lane.mjs` | 非面（runner） | 只调度 weekly 全量。 |
| `tools/repo/run-check-tests.mjs` | 非面（runner） | 只调度 tests/checks。 |
| `tools/repo/snapshot-path.mjs` | 非面（查询） | 解析引用、打印路径，不读不写证据。 |
| `probes/team/read-barrier/index.mjs` | 非面（fixture） | 实验监听器，被 concurrency probe overlay 加载。 |
