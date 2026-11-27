# 维护面例外登记

> 什么时候读：某个入口不在目录默认面上（`checks/` judge · `probes/` show · `tools/` operate），或想知道「为什么它不算面」时。
> 规则与判定顺序 = [policy.md §P6](../policy.md#p6-维护面契约两层--三面d63)；本页只登记，不重述规则。例外只在本表出现一次；新增/撤离同 diff 改这里。

| 路径 | 面 | 理由 |
|---|---|---|
| `checks/audit/candidate-scan-eval.mjs` | 非面（已耗） | 头注 `状态：已耗（2026-11-13 语料已移出本仓）`；缺语料 exit 2。 |
| `checks/lanes/fast-lane.mjs` | 非面（runner） | 只调度 FAST 4 条，自身不证明行为。 |
| `checks/lanes/keyless-lane.mjs` | 非面（runner） | 只调度 weekly 全量。 |
| `tools/repo/run-check-tests.mjs` | 非面（runner） | 只调度 tests/checks。 |
| `tools/repo/snapshot-path.mjs` | 非面（查询） | 解析引用、打印路径，不读不写证据。 |
| `probes/team/read-barrier/index.mjs` | 非面（fixture） | 实验监听器，被 concurrency probe overlay 加载。 |
