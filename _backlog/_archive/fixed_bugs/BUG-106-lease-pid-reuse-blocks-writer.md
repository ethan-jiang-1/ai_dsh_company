---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-106：writer lease 只用 PID 存活判 stale；PID 被无关进程复用后旧锁永久挡住新 writer（`startedAt` 不参与）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / lease）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

锁文件 `<DSH_HOME>/company-pack.lock` 里有 `startedAt: 2020-…`，`pid` 是一个**活着但与公司无关**的进程；`acquireCompanyLease` 仍拒绝：

```
lock with live non-writer pid -> {"acquired":false,"reason":"另一个 writer 正在使用这个 home（pid 81824）"}
```

即：进程崩溃留下的锁，只要它的 PID 后来被任何长命进程复用，新 host 就永远被挡在「公司数据停写」；用户只能手工删锁。锁里其实有 `startedAt`/`token`，但 `isAlive(pid)` 是唯一判据，`startedAt` 完全不参与。

## 根因（假设）

- `isAlive(pid)` = `process.kill(pid,0)`；`parseHolder` 读到的 `startedAt`/`token` 只用于写/回读，不用于判断锁是否可能属于当前 host。
- 没有 heartbeat / 锁文件 age / 进程命令身份校验；PID 复用是不可区分的情况。
- 拒绝文案说「另一个 writer 正在使用这个 home」，实际可能是一个无关进程。

## 暴露的失败类

**「PID 活着」被当成「writer 活着」**：PID 是复用标识，不是进程身份；stale 判据需要 age/heartbeat/可验证的 owner，而不是单次存活探测。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-lease.mts
```

当前输出：

```
lock with live non-writer pid -> {"acquired":false,"reason":"另一个 writer 正在使用这个 home（pid 81824）"}
lock exists true
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- 给 lease 加 heartbeat（每 N 秒 touch）或 `startedAt` age 上限；超过阈值且无 heartbeat → 视为 stale，但要避免把真 writer 抢掉（先 probe owner）。
- 或校验 `/proc/<pid>/cmdline` / `ps` 命令身份包含 `dsh`（跨平台 fallback：token 文件 + mtime）。
- 拒绝文案区分「holder 可能不是 writer（pid 复用）」并给可操作命令（确认/删除锁）。
- spec：live-but-unrelated pid + 老 startedAt → 可接管/给安全提示；真 live writer 仍拒绝。

## 修复关联

- 发现于 C3 lease 回归；与 [BUG-101](BUG-101-concurrent-home-smoke-stale-v2-and-lease-timing.md) 同属 lease 生命周期，但本卡是 PID 身份问题。
- 合同：[`docs/runtime-map.md`](../../../docs/runtime-map.md) 二·五（writer lease）；`src/host/run-bundle/lease.ts`。

## 已修判定

修成：lease 持有者每 30s touch 锁 mtime；acquire 仅在「PID 存活 + mtime ≤120s」时拒绝；存活但 mtime 过期视为 PID 复用可接管并回 warning；`touchLease` 只更新自己 token 的锁。

- keyless：活 PID + 10 分钟前 mtime → acquired + warning；活 PID + 新锁 → 拒绝；touch 别人 token 不改 mtime。
- 红证：HEAD 版 lease → 2 failed；复原 4 passed。
