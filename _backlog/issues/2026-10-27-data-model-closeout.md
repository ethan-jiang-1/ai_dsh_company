---
status: 推敲中
opened: 2026-10-27
---

# 推敲：数据模型 12 个 Gap 之后的收尾（R1–R6）

> 立卡：2026-10-27 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：做；R1–R3 是“完全落地”的 P0，R4–R6 是硬化；证据回填 [Gap 卡](2026-10-27-data-model-gaps.md) 与 Note。

**问题与期望结果：** G1–G12 已落树，但“完全落地”还差四类收尾：面板仍全量读记录、多 Host 共享 home 只有文档边界没有运行时护栏、revoke 只有同步回滚没有崩溃恢复、presented 从会话事件重建只有 keyless 证据。期望按 R1–R6 收口，并把每条边界写进数据卡，不再用“已知边界”代替行为。

**当前情况：** 0.3.12 已推送；Gap 卡 P0/P1/P2 均落树，剩余项见下表。`concurrent-home-smoke` 只证明“可解析”，不证明“可安全并发”。

**未决问题：** R1 的“只读最近 N 条”不能藏旧 open；R2 的锁/租约在崩溃后如何判定 stale；R4 的崩溃恢复需要 pending journal 的格式与容忍度；R5 的孤儿方法是否自动修复还是只报告。

**下一步：** R1/R2/R3 先做（P0），R4/R5/R6 随后；每项独立 commit + 真证据。

## 范围与排除项

- 范围：records 面板加载策略、同 home writer 护栏、presented 重建真证据、revoke 崩溃恢复、方法/记录对账、manifest 创建的文件系统保底。
- 排除：多租户、跨机器同步、方法层迁 home 级（无真实多 profile 需求前不做）。

## R 账

| # | 收尾项 | 风险 | 验收 |
|---|---|---|---|
| R1 | 面板全量读 records | 中 | 先读全部 frontmatter 摘要，只为 open + 最近 N 条读全文；旧记录显示“未展开 N 条”，不藏 open |
| R2 | 多 Host 共享 home 无运行时护栏 | 中 | home lease：同 home 第二个 writer 被点名并停写公司数据；崩溃后 stale 可接管 |
| R3 | presented 重建只有 keyless | 中 | 真 smoke：present → 删 index/ledger → 重启 → true 从会话事件回来；false 审计不丢 |
| R4 | revoke 跨 store 崩溃窗口 | 中 | pending journal：崩溃后下次启动能判定“方法在/记录在”并回滚或完成，不猜 |
| R5 | 方法/记录孤儿无对账 | 中低 | `/cultivation check` 报告 adopted 记录缺方法、方法无记录；只报告不自动删 |
| R6 | manifest 首建依赖 hard link | 低 | home 在不支持 hard link 的文件系统上回退到 `wx` 单写并告警（不静默失败） |

## 方案与取舍

- R1 不直接 cap 总数：cap 会藏旧 open；用“摘要全扫 + 全文按需”兼顾正确与成本。
- R2 用 `<DSH_HOME>/company-pack.lock` + PID stale 判定，不引入外部依赖；锁失败 fail-closed 到“停写公司数据”，不拦 DSH 会话。
- R4 用 pending journal 而不是“再试一次”；journal 放 `cultivation/.pending-revoke.json`，启动/下次命令时对账。
- R5 只报告，不自动删方法/记录：删除是人的决定。
- R6 只对 `EPERM`/`ENOTSUP`/`EXDEV` 回退，且写告警；正常路径仍用原子发布。

## 验收标准

- [ ] R1：records 摘要全扫；open 全量；非 open 只读最近 N；未展开条数可见；keyless + 面板静态渲染证据。
- [ ] R2：同 home 两进程真启动一个 writer；第二个输出点名并停写公司数据；stale 锁可接管；`concurrent-home-smoke` 更新。
- [ ] R3：present-catalog 真 smoke 删 index/ledger 后重启恢复 true；false 审计保留。
- [ ] R4：注入 revoke 崩溃点后重启，方法/记录回到一致态；journal 清理。
- [ ] R5：`/cultivation check` 报告两类孤儿，不自动改盘。
- [ ] R6：模拟 hard link 失败回退并告警；正常路径不回归。
- [ ] `pnpm verify` + `pnpm test` + release/lifecycle/concurrent 相关 smoke 全绿。
