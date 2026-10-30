# 数据模型 P1/P2：记录一致性、方法层边界、归档/坏记录、落点与本地键

状态：已交付（2026-10-27；G8 的“面板全量读”保留为已知边界，见卡）
上游 = [DSH 数据模型（FAQ 26）审计出的部署 Gap](../../_backlog/_archive/settled_issues/2026-10-27-data-model-gaps.md)

> **2026-10-28 M3 部分取代（G7 方法层边界）**：方法层已迁公司级 `<DSH_HOME>/company/methods/<role>/`，
> 同 home 多 profile 共享；本文 §决定 4 与 §后果 的“按 profile 隔离/各一份”作废。
> 见 [data-model](../../docs/data-model.md) §四、[profiles.ts](../../packages/company-pack/src/host/profiles.ts) 与
> [数据设计硬化 Note](./2026-10-28-data-design-hardening.md)；
> 其余 G6/G8/G11/G12 仍有效。

## 问题

P0 收口后，Gap 卡还剩 G6（record CAS/revoke 半状态）、G7（方法层 profile 边界）、G8（records 无 GC/坏记录静默/面板全量读）、G11（companyHome 危险值）、G12（localStorage 键名/降级未验）。这些不是发布阻断，但会在长期运行和搬迁/多 profile 场景里变成数据不一致。

## 决定

1. **G11 落点安全**：新增 `validateCompanyHome`——规范化 DSH_HOME/OS home/目标后，拒绝等于/包含 home 或 OS home、拒绝普通文件；host 在配置落点不安全时停写公司数据（自举/升级/成品目录/培养命令）并告警。默认 `<DSH_HOME>/company-workspace` 合法。
2. **G12 本地键版本化**：浮窗几何改 `dsh-company-pack/float/v1/`，旧前缀只读迁移一次；实例心跳改 `dsh-company-pack/instances/v1`（心跳是瞬时态，不迁移）。`lifecycle-smoke` 增加 v2→v1 降级：改过的基部保留、未改的回到旧版、扩张面不动。
3. **G6 记录一致性**：`updateRecord` 接受 expectedText；读取后记录被外部改动则拒绝写（adopt/reject/verify 都提示重试）。revoke 先改记录、后删方法；方法删除失败时用先前全文回滚记录。跨 store 崩溃窗口仍不是事务，多 Host 共享 home 不支持——文档写清，不冒充。
4. **G7 profile 边界**：新增 `profilesWithCompanyPack`，启动时点名同 home 里多个装了本包的 profile，并明确“方法层按 profile 隔离，一公司固定一个 web profile”。不把方法层迁 home 级（会改 presets 的 `customSkillDirs` 构造，留作未来需求）。
5. **G8 归档/坏记录**：新增 `/cultivation archive <天数>`，只移非 open 且早于天数的记录到 `cultivation/records-archive/`；open、坏记录、时间戳不识别的记录不动。面板新增 `brokenRecords` 明面点名（文件名 + 条数），不再静默丢。**面板仍全量读**，用归档控制规模；分页留作后续。

## 输掉的方案

- **方法层立即迁 home 级**：能解决多 profile，但要改六个 preset 的 `customSkillDirs` 与 host config 构造，风险大于本轮收益；先立边界，等真实多 profile 需求。
- **revoke 做完整两阶段事务/待办日志**：能覆盖崩溃窗口，但要新增 pending journal、启动恢复与迁移；本轮只保证同步失败回滚，边界写进文档/卡。
- **面板分页/只读最近 N 条**：可能把旧的 open 记录藏起来，违背“收件箱不撒谎”；先用 `/cultivation archive` 让人显式归档。
- **心跳键迁移旧值**：心跳是 20s 瞬时态，迁移没有价值；旧键自然过期。

## 后果

- `/cultivation archive` 是人工动作；不自动删记录。坏记录仍留在盘上，面板点名，需人修/删。
- 同一 home 多 profile 仍会共享公司盘/记录但方法层各一份；启动只告警，不阻止。
- 多 Host 共享 home 仍不支持；record CAS 只覆盖单进程读改写窗口。
- 降级 smoke 只证明 tarball 替换路径，不证明 registry 升级或并发。

## 验证

真跑过（2026-10-27）：

| 命令 | 结果 |
|---|---|
| `pnpm test` | 95 files / 889 tests 全绿（新增 profiles/apply 多 profile/board broken/archive/CAS/revoke 回滚 specs） |
| `node checks/smoke/lifecycle-smoke.mjs` | ALL PASS（含 **v2→v1 降级**、business 恢复、搬 home） |
| `pnpm verify` | ALL PASS（0.3.12 手册/数据卡/Note/Gap 卡链接齐） |
| `node checks/smoke/release-smoke.mjs` | ALL PASS（0.3.12 真 tarball 安装/首启/二启零变更） |
| `node checks/smoke/isolation-matrix-smoke.mjs` | ALL PASS（含 explicit rebind；落点校验不回归） |
| `node checks/smoke/upgrade-while-running-smoke.mjs` | ALL PASS（0.3.12 运行中升 0.3.13；session/data 保留） |
| `node checks/smoke/present-catalog-smoke.mjs` | ALL PASS（presented 账本） |

红证（实跑）：临时把 `validateCompanyHome` 改成直接 `{ ok: true }` → `pnpm exec vitest run tests/company/apply-rebind.spec.ts -t "DSH_COMPANY_HOME=DSH_HOME"` 红：`expected false to be true`（home 根出现 `AGENTS.md`）；还原 → 绿。

## 范围 / 排除

- 范围：Gap 卡 G6/G7/G8/G11/G12 的现在时行为、测试与文档。
- 排除：多 Host 锁、records 面板分页、方法层 home 级、跨 store 事务日志；这些留在 Gap 卡/后续需求。
