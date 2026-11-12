---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-115：lease 的 stale 接管只换锁不 fence 旧 writer；旧 host 恢复后两个 writer 同时写公司数据

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（token fence + gate）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / lease）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

S6 用 heartbeat mtime 修了 PID 复用：

- A host 拿 lease，每 30s touch；
- 若 A 被 SIGSTOP/长 GC/挂起 >120s，B host 把锁视为 stale release，`unlink` 后写自己的锁并 **warning** 接管；
- A 恢复后仍然 `acquired`（它自己的 `held` 不变），继续写公司数据；B 也在写。**没有 fencing/租约失效通知**。

实测：子进程 A 先 `ACQUIRED`；父进程用 `now+130s` acquire：

```
child ACQUIRED
parent {"acquired":true,"warning":"接管了 stale writer lease（pid 46719，PID 存活但锁 mtime 已过期；可能是 PID 复用）"}
```

两边都返回 acquired；A 的 `dataBlocked` 仍是 false（它只在启动时取一次 lease），恢复后照常写。lease 从「防静默互写」退化成「一个 warning 后允许互写」。

这不是单纯「PID 复用」误伤：**即使 takeover 判对了（A 确实短暂停顿），旧 writer 也不会被阻止**。修复 Note 已把「接管只 warn，不做双写仲裁」列为剩余风险，但这是 lease 的核心承诺。

## 根因（假设）

- lease 是「启动时一次性锁」，不参与每次写；takeover 只改盘上锁文件，没有通知/失效旧 host 的 `held`。
- 没有 fencing token / epoch：writer 写之前不校验「我的 token 仍是盘上 token」；旧 writer 不知道锁已被换。
- `LeaseResult` 的 takeover warning 只给新 host；旧 host 无感知。

## 暴露的失败类

**锁的获取与写权限解耦**：拿过锁就永久认为自己有写权限；锁被接管后旧持有者继续写。分布式锁需要 fencing（每次写校验 token/epoch，或写路径带 epoch），不能只在 acquire 时判一次。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-live-takeover.mts
```

2026-11-13 原始输出：

```
child ACQUIRED
parent {"acquired":true,"warning":"接管了 stale writer lease（pid 46719，PID 存活但锁 mtime 已过期；可能是 PID 复用）"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- write gate：每次公司数据写前 `assertLeaseToken(token)`（读锁文件，token 不符 → dataBlocked/停写）；或把 epoch 写进数据路径并在读时校验。
- takeover 后通过 lock file 的 token 变化让旧 host 的下一次写失败（fail loud）；旧 host 恢复时检测 `held` token 与盘上不符。
- 若产品不做 fencing：至少把 takeover 做成「旧 host 不可恢复」的显式状态，并在 UI 显示；不能只 warn。
- spec：A 拿锁→B 用过期 now 接管→A 的写 gate 拒绝；B 写成功；A 的 release 不删 B 锁。

## 修复关联

- 发现于 S6 heartbeat 修复后的回归扫；与 [BUG-106](BUG-106-lease-pid-reuse-blocks-writer.md) 同面但不同根因（PID 判据 vs fencing）。
- 相关：`src/host/run-bundle/lease.ts`；`Acquire` 只在 boot 调用。

## 已修判定

修成：lease heartbeat 每次 `touchLease` 校验盘上 token，不符即 `blockCompanyWrites`；新增进程级写 gate，`writeCompanyAtomic`/bootstrap/export 写前 assert，旧 writer 恢复后下一次写被拒（最长 30s 窗口）。
- keyless：盘上 token 被换 → `touchLease` false；blocked 时写公司盘抛 `CompanyWriteBlockedError`；红证：HEAD lease → 2 failed。
