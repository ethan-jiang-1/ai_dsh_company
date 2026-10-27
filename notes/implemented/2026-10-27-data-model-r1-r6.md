# 数据模型收尾 R1–R6：面板加载、writer lease、重建证据、崩溃恢复、对账、hardlink 回退

状态：已交付（2026-10-27）
上游 = [数据模型收尾 R1–R6](../../_backlog/_archive/settled_issues/2026-10-27-data-model-closeout.md)

## 问题

0.3.12 已把 12 个 Gap 落树，但“完全落地”还差六项：records 面板全量读、同 home 多 writer 只有文档边界、presented 重建只有 keyless 证据、revoke 只有同步回滚没有崩溃恢复、记录/方法无对账、manifest 首建依赖 hard link。

## 决定

1. **R1 面板两段读**：先读每条记录的头部（frontmatter + 少量正文）做摘要全扫；open 全部读全文（不能藏旧待办），非 open 只读最近 `FULL_RECORD_LIMIT = 120` 条；未展开条数在面板明示。坏记录继续点名。
2. **R2 writer lease**：`<DSH_HOME>/company-pack.lock` 原子创建；同 home 第二个进程被点名并停写公司数据（DSH 会话仍可用）；stale PID 可接管；正常 dispose 释放。它不是多 Host 高可用锁，只防静默互写。
3. **R3 presented 重建真证据**：`present-catalog-smoke` 在真实 present 后删 index + ledger，用 `ctx.sessionQuery` 回扫真实事件恢复 true；false 审计在删索引后仍保留。
4. **R4 revoke pending journal**：revoke 前写 `cultivation/.pending-revoke.json`（旧记录全文 + role/slug/revokedAt）。恢复规则：方法还在 ⇒ 回滚记录；方法已不在 ⇒ 补完 `revokedAt`；记录被外部改成第三种形状 ⇒ conflict，日志保留不覆盖。
5. **R5 `/cultivation check`**：只报告 adopted 记录缺方法、方法无记录两类孤儿；不自动删改。
6. **R6 manifest hardlink 回退**：`linkSync` 遇 `EPERM/ENOTSUP/EOPNOTSUPP/EXDEV/EMLINK` 时回退 `wx` 单写；仍不覆盖，但告警“非原子发布”。

## 输掉的方案

- **R1 直接 cap 总数**：会藏旧 open 记录，违背收件箱不撒谎；选择摘要全扫 + open 强制全文。
- **R2 沿用“文档说不支持”**：并发 smoke 只证明可解析，不证明谁在写；选择 fail-closed 到“停写公司数据”。
- **R4 只做同步回滚**：崩溃窗口仍在；选择 pending journal，但保留“外部改动不覆盖”的冲突出口。
- **R5 自动删孤儿方法**：删除是人的决定；只报告。
- **R6 继续抛 hard link 错误**：网络盘会让 manifest 首建失败；选择回退 + 告警。

## 后果

- 面板非 open 记录超过 120 条时只显示摘要；未展开计数可见，用 `/cultivation archive` 控制规模。
- 同 home 第二个 writer 的 DSH 会话仍能开，但公司数据命令/自举/成品目录停写；lease 崩溃后 stale 接管。
- pending journal 冲突时保留日志，需人看；不自动猜。
- hardlink 回退路径不是原子发布；只在文件系统不支持时发生，启动有告警。
- 多 Host 高可用、跨机器事务仍不支持。

## 验证

真跑过（2026-10-27，0.3.13）：

| 命令 | 结果 |
|---|---|
| `pnpm test` | 97 files / 898 tests 全绿（含 lease、revoke journal、check、bounded records、hardlink fallback） |
| `pnpm verify` | ALL PASS |
| `node checks/smoke/release-smoke.mjs` | ALL PASS（0.3.13 真 tarball 安装/首启/二启零变更） |
| `node checks/smoke/lifecycle-smoke.mjs` | ALL PASS（v2→v1 降级、business 恢复、搬 home） |
| `node checks/smoke/concurrent-home-smoke.mjs` | ALL PASS（同 home 恰好一个 writer；stale lease 接管） |
| `node checks/smoke/present-catalog-smoke.mjs` | ALL PASS（删 index/ledger 后重建 true；false 审计保留） |
| `node checks/smoke/isolation-matrix-smoke.mjs` | ALL PASS |
| `node checks/smoke/upgrade-while-running-smoke.mjs` | ALL PASS（0.3.13→0.3.14） |

红证（前轮 G11，仍适用）：临时让 `validateCompanyHome` 返回 `{ ok: true }` → apply 测试红（home 根出现 `AGENTS.md`）；还原绿。R1/R2/R3/R4/R5/R6 的判据均以新增 spec/smoke 覆盖，未造单独红样。

## 范围 / 排除

- 范围：R1–R6 的现在时行为、测试、文档。
- 排除：多 Host 高可用/事务、records 面板真分页（当前是摘要+最近 120）、方法层迁 home 级。
