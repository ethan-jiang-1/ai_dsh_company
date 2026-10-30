# collaboration：多人协作的锁、读屏障与认领让位

> 问题：成员在同一轮或跨轮并发写、共同读屏障、认领竞争时，真实机制边界在哪；BUG-007 那批探针假绿如何被真实验收替换？
> 消费者：[2026-10-09 协作安全验收](../../settled_issues/2026-10-09-collaboration-safety-acceptance.md)、[BUG-007](../../fixed_bugs/BUG-007-collaboration-probe-false-positives.md)
> 产出的卡：—
> 归档：2026-10-10

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-10-09-teamagent-locks-and-acceptance-audit.md](2026-10-09-teamagent-locks-and-acceptance-audit.md) | 锁与 teamagent 保证复核、旧落地断点与验收资产盘点 | 2026-10-09 |
| [2026-10-09-deterministic-write-conflict-seam.md](2026-10-09-deterministic-write-conflict-seam.md) | 同观察版本竞写的确定性屏障与合并接缝 | 2026-10-09 |
| [2026-10-09-team-read-barrier-seam.md](2026-10-09-team-read-barrier-seam.md) | post-execute 读屏障的接入点与限制 | 2026-10-09 |
| [2026-10-09-team-read-barrier-acceptance.md](2026-10-09-team-read-barrier-acceptance.md) | 双成员同轮放行、freshness 拒写与败者恢复验收 | 2026-10-09 |
| [2026-10-09-member-stale-write-acceptance.md](2026-10-09-member-stale-write-acceptance.md) | 成员 stale 拒写与恢复子路径 | 2026-10-09 |
| [2026-10-10-claim-loser-yield-acceptance.md](2026-10-10-claim-loser-yield-acceptance.md) | 认领败者让位行为对照（owner-bound vs shared） | 2026-10-10 |
