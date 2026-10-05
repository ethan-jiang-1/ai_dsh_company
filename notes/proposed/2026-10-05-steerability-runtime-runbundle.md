# 2026-10-05 · RFC：运行态 owner 与 run bundle 逻辑合同（毕业拆分 4/6）

> 状态：RFC（已批准待实施；实施次序由用户逐条点名，D32）｜批准：2026-10-05 用户对话拍板（来源 = 推敲卡
> [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md)
> 毕业；本条含同批两项拍板：run bundle = 逻辑合同——扩展 snapshot.yml/场景 README 的引用字段，不新增
> 可提交 manifest 文件；退役 profiles/company = 保留 + 文档标记退役，删除留作后续单独决定）

## 问题

dev/ 运行态无 owner 文档，多类状态易混（2026-10-05 核验）：

- 双 home（dev/harness-home 主 + dev/harness-home-b 第二）、profiles、sessions、storages、session-search
  DB、startup logs、replay-runs、replay-diagnosis、pw-browsers、排练盘、系统 tmp 出口——权威性与生命
  周期无一处理清；replay Web lane 的现场/失败诊断部分落系统 tmpdir，不都在 repo 开发 home（须诚实呈现）。
- 退役 `profiles/company` 仍在主 home 与 headless/web 并存：file: 复制形状和旧 Web 版本可能误导维护者。
- `company-workspace/deliverables-archive`（业务产物历史）与 snapshots/archive（证据时点副本）语义只靠
  目录名区分；公司手册 [company-workspace/AGENTS.md](../../company-workspace/AGENTS.md) 第 23 行仍指旧
  平铺快照形状（迁移前 `snapshots/<场景>/`）。
- 一次运行的可追溯视图（run bundle）无字段合同。

## 方案

1. **dev/ 运行态 owner 说明**（拟新增 dev 侧 README 或扩 [dev/harness-home/README.md](../../dev/harness-home/README.md)
   ——实施时定唯一家）：逐项写权威性、生命周期、current/retired/generated/runtime 标记。
2. **退役 profile 处置（拍板：保留 + 标记）**：owner 文档与运行态地图（见
   [入口与运行态地图 RFC](2026-10-05-steerability-entry-runtime-map.md)）标 profiles/company =
   retired/非权威/不可作为当前入口；不删除、不隔离——删除留作后续单独决定（届时先查消费面）。
3. **层级事实钉死**：`DSH_HOME` 是数据层不决定代码来源；session cwd 是业务事实层；repo cwd 不是自动
   公司盘；排练盘不可写 live 公司盘。
4. **两个 archive 语义 + 修手册旧指针**：deliverables-archive 与 snapshots/archive 各一句话语义入 owner
   文档；公司手册第 23 行旧快照形状改指现行分类形状（手册行预算 195 内）；快照合同 owner =
   [snapshots/README.md](../../snapshots/README.md) 不动。
5. **tmp/浏览器出口登记**：系统 tmp、失败诊断、浏览器 profile 的位置与清理策略如实记录；受控重定向
   留触发条件（§11 工具态纪律：先重定向进 repo gitignored 区再首次用）。
6. **run bundle = 逻辑合同（拍板）**：最小字段——runId、代码/DSH pin、profile 与 bundle、实际 preset、
   skill/tool 证据、session ids 与日志世代、session cwd、workspace 变更、产物、验证命令、snapshot/audit
   引用、临时出口与保留策略——定义为 snapshot.yml/场景 README 的引用规则：manifest 只引用 live
   session log/workspace/snapshot，不复制、不成第二权威；live 权威仍是 DSH session + workspace；
   现有场景表达不了时才在场景层加字段。
7. **联动**：run bundle 的「session ids 与日志世代」字段依赖
   [日志世代修复 RFC](../implemented/2026-10-05-steerability-log-generation.md)（已实施——pickSessionLog 统一语义）的选择语义。

## 输掉的方案（留尸）

- **独立可提交 run manifest 文件**：复制 live 状态必成第二权威（用户裁决逻辑合同；反双事实家纪律）。
- **删除 profiles/company**：保留迁移材料；删除是独立决定，需消费面清单与回滚方案。
- **运行残留提交进仓**：gitignored 运行态不进版本控制。

## 验收

- owner 文档与 dev/ 实际目录逐项一致（抽核 + `pnpm verify` 绿）。
- 公司手册旧指针修复（verify 含 handbook/doc 预算与链接门禁）。
- 任选一个已有场景按 run bundle 字段反查：session id、日志世代、workspace 引用、验证命令、snapshot
  引用（走查记录进实施 Note）。
- tmp/浏览器出口有位置与清理策略行。
