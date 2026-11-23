---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-345：`acquireCompanyLease` 重入分支 `release()` 漏掉 `clearInterval`，主持有先释放时心跳定时器永久泄漏

> 严重级别：P2（资源/定时器泄漏：同进程内若先由首次持有方释放再由重入方最后释放，30s 心跳 `setInterval` 永远不清理）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（抽出共享 `releaseLease` 与幂等 `makeRelease`）
>
> **留痕**：commit 40a751cc（内部重入释放定时器清理，非材料性）。

## 症状

同一 `dshHome` 在同进程内被 [`acquireCompanyLease`](../../../packages/company-pack/src/host/run-bundle/lease.ts#L91-L143) 连续获取两次（`first`、`second`）且释放顺序为 `first.release()` → `second.release()` 时，`held` 表与磁盘 `.lock` 文件都被清理，但首次获取时启动的 `LEASE_HEARTBEAT_MS`（30s）`setInterval` **从未被 `clearInterval`**，持续在进程内每 30 秒尝试读取锁文件并在发现文件消失后再次调用 `blockCompanyWrites(...)`。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/run-bundle/lease.ts`](../../../packages/company-pack/src/host/run-bundle/lease.ts#L94-L143)。

## 复现

```sh
node --input-type=module -e "
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireCompanyLease } from './packages/company-pack/src/host/run-bundle/lease.ts';
const home = mkdtempSync(join(tmpdir(), 'lease-'));
const origClear = globalThis.clearInterval;
let cleared = 0;
globalThis.clearInterval = (t) => { cleared += 1; return origClear(t); };
const a = acquireCompanyLease(home);
const b = acquireCompanyLease(home);
a.release(); b.release();
console.log({ cleared });
"
```

实测输出 `{ cleared: 0 }`（若按相反顺序 `b.release(); a.release()` 则为 `{ cleared: 1 }`）。

## 根因与证据

1. `lease.ts:94-110`（重入分支）与 `lease.ts:132-142`（首建分支）复制了两份 `release` 闭包逻辑；
2. 后来首建分支在 第 136 行补上了 `if (entry.timer !== undefined) clearInterval(entry.timer)`，但重入分支（第 99-108 行）遗漏了这一行，导致当重入方成为最后一个 `refs === 1` 的释放者时，定时器既没清也没了句柄。
3. 更危险的是：被泄漏的心跳回调后续仍会运行 `touchLease`，因锁文件已被删除而返回 `false`，进而在第 124 行误调用 `blockCompanyWrites('writer lease 已被接管...')` 锁死之后同进程新启动的写入。

## 失败类与同类排查

- **失败类**：重复 `release` 闭包未抽取唯一清理函数，单侧补丁漏同步。
- **同类排查**：`lease.ts` 仅此两处构造 `release` 函数。

## 修复方案与范围

- **根因修法**：抽成单一共享 `releaseLease(path)`（确保每次最后一次 `refs === 1` 释放都执行 `clearInterval(entry.timer)`、校验 token 删锁文件、并 `held.delete(path)`），消除两份重复闭包。

## 已修判定

- 重入 `acquireCompanyLease` 无论按 `a→b` 还是 `b→a` 顺序释放，`clearInterval` 均恰好触发 1 次，且后续不会有残留心跳误触发 `blockCompanyWrites`。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/lease.ts`、`tests/host/run-bundle/lease.spec.ts`
- 红：`pnpm test tests/host/run-bundle/lease.spec.ts` —— 修复前 1 failed / 8 passed（`first→second` 释放顺序下 `clearInterval` 调用次数为 `0`）
- 绿：`pnpm test tests/host/run-bundle/lease.spec.ts` —— 9/9 passed（`first→second` 释放顺序下 `clearInterval` 恰好触发 1 次且锁文件删除）
- 提交：commit 40a751cc
