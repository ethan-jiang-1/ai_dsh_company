# snapshots/ —— 合成回放 fixture（产品仓）

> 2026-10-25：产品仓不再保存真实部署证据（真实 snapshots 已移私有归档，不进本仓历史）；只保留
> **合成、keyless** 的回放场景、一份 UI 金样与**认证档答卷归档**（真模型、合成任务），用于
> `replay-smoke` / `ui-scene-smoke` / `entry-probe-smoke` 与快照门禁。
> 场景不含任何客户、动议、会话或交付物数据。

## 场景

| 场景 | 现有资产与证明范围 | 消费入口 |
|---|---|---|
| [replay/foundation-workspace](replay/foundation-workspace/) | authored 文件工具回放：`workspace.before → expected` 完整树、replay fixtures、sidecars；无公司事实 | [replay-smoke](../checks/smoke/replay-smoke.mjs) |
| [visual/company-shell](visual/company-shell/) | UI 金样：隔离空壳（无会话）下 9 个公司页签的归一化可见文本；断言外壳与空态，不覆盖会话数据面 | [ui-scene-smoke](../checks/smoke/ui-scene-smoke.mjs)（`--isolated --golden`）+ [ui-golden-freshness](../checks/gates/ui-golden-freshness.mjs) |
| [probes/entry-probe](probes/entry-probe/) | 认证档答卷归档：真模型对入口链 13 题的逐题答案 + 来源哈希（合成任务；无部署/客户数据） | [entry-probe-smoke](../checks/smoke/entry-probe-smoke.mjs)（真模型，按日期追加） |

## 规则

- **来源性质**：本场景的 `workspace.expected/` 是 authored fixture，**不是独立 oracle**；每个场景必须在其 `snapshot.yml` 或 README 声明来源性质。

- 新场景必须**合成/脱敏**：真实部署证据不进产品仓，也不进 git 历史。
- `snapshot.yml` 的 `replayEligible` 三态与「资格理由（日期）」由 `replay-scene-liveness` 门禁查。
- 体积、索引与注入面由 `snapshots-budget` / `snapshot-index` / `replay-fixture-freshness` 守；UI 金样与注册面一致由 `ui-golden-freshness` 守。
- UI 金样的唯一更新入口 = `node checks/smoke/ui-scene-smoke.mjs --isolated --refresh-golden`（手改金样 = 让回归网失真）。
- 证据的现行家 = 部署仓/run bundle（`runtime/backups/` 只作本机迁移副本，不进 git）。
