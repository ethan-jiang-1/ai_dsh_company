---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-254：不可读的 live lease 被当 stale 删除并抢占

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`acquireCompanyLease` 对 `readFileSync` 失败按 stale 处理；权限 000 的 live lease 会被 `unlinkSync` 后重新获取，两个 writer 可同时写。

## 复现

临时 home：写 `{schema:1,pid:process.ppid,token:'live',startedAt:'x'}`，chmod 000；`acquireCompanyLease` 返回 acquired true（并删除锁）。


```sh
pnpm test tests/host/run-bundle/lease.spec.ts
```

## 根因与证据

`parseHolder` 读失败/为空都折成 stale；无法区分「坏文件」与「不可读的活锁」。

## 失败类与同类排查

**失败类 = lease 的 fail-open 边界。**

## 已修判定

修成什么算修好：

1. lease 读失败 EACCES/EPERM fail-closed，不 unlink；ENOENT 可重试；空/坏 JSON 仍 stale。
2. 负例：chmod 000 live lease → acquired false + 不可读，锁仍在。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/lease.ts`、`tests/host/run-bundle/lease.spec.ts`
- 红：`pnpm test tests/host/run-bundle/lease.spec.ts`（chmod 000 live lease 被删后抢占）
- 绿：`pnpm test tests/host/run-bundle/lease.spec.ts`（EACCES/EPERM fail-closed，锁仍在）
- 提交：commit 21ff3ee7
