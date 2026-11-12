---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-124：`company-pack.lock` 被目录（或 symlink→目录）占住时 lease 永远「竞争失败」，不报坏形状也不接管

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（锁形状）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C3 / lease）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`<DSH_HOME>/company-pack.lock` 是**目录**时：

```ts
mkdirSync(leasePath(home))
acquireCompanyLease(home)
→ { acquired:false, reason:'writer lease 竞争失败（另一个进程抢先）' }
```

既没有 holder、没有「坏锁形状」诊断，也不会接管。原因：
- `writeFileSync(path,text,{flag:'wx'})` → EEXIST；
- `readFileSync(path)` → EISDIR，被 catch 成 `current=null`；
- `unlinkSync(path)` 对目录抛错，被 catch 吞掉；
- 两次 attempt 后返回「另一个进程抢先」——**没有任何进程**占锁，用户看到的是误导文案。

symlink→目录同样（unlink symlink 会成功，但如果目标/权限让 `writeFileSync` 继续失败，会循环）；核心是「非普通文件锁」没有显式分类。

## 根因（假设）

- 锁文件形状只通过 `readFileSync`/`parseHolder` 判断；`parseHolder(null)` 与「坏文件」同路，随后 `unlink` 失败被 catch。
- 没有 `lstat` 判「普通文件 / 目录 / symlink」；目录锁没有「请手工删除/修复」的可操作错误。
- 拿到 `EEXIST` 后第二次仍走同一路径，最终返回 generic 竞争失败。

## 暴露的失败类

**锁的坏形状被当成竞争**：锁文件路径可能被目录/链接占用；不先证明「普通文件」就 `read/unlink`，失败后只能给 generic 文案。lease 是启动护栏，坏形状必须 fail loud + 可操作，不能伪装成「另一个 writer 抢先」。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-lease-dir-lock.mts
```

2026-11-13 输出：

```
{"acquired":false,"reason":"writer lease 竞争失败（另一个进程抢先）"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `acquireCompanyLease` 在 `EEXIST` 后用 `lstatSync`：
  * 普通文件 → 现有 parse/stale 逻辑；
  * symlink → 不跟随，报「锁是 symlink，拒绝/请手工删除」；
  * 目录/其它 → 报「锁路径不是普通文件：…（删除该目录后重试）」；
- `unlinkSync` 失败不要静默成「对手抢先」；把最后一次 errno/形状写进 reason。
- 加 spec：目录锁、symlink 锁、坏 JSON、空文件、正常锁；每种给确定性错误/接管。

## 修复关联

- 发现于 C3 lease 坏形状回归；与 [BUG-106](BUG-106-lease-pid-reuse-blocks-writer.md)（PID 复用）和 [BUG-115](BUG-115-lease-takeover-no-fencing-old-writer.md)（接管 fencing）同面，但本卡是**锁路径形状**。
- 相关：`src/host/run-bundle/lease.ts` 的 `acquireCompanyLease`。

## 已修判定

修成：acquire 在 EEXIST 后先 lstat 锁路径：symlink → 「锁是 symlink，请手工删除」；目录/非普通文件 → 「不是普通文件」，不再返回 generic 竞争。
- keyless：目录锁/符号链接锁各自给确定性 reason；红证：HEAD lease → 2 failed（含 115）。
