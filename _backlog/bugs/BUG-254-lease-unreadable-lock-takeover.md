---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-254：不可读的 live lease 被当 stale 删除并抢占

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`acquireCompanyLease` 对 `readFileSync` 失败按 stale 处理；权限 000 的 live lease 会被 `unlinkSync` 后重新获取，两个 writer 可同时写。

## 复现

临时 home：写 `{schema:1,pid:process.ppid,token:'live',startedAt:'x'}`，chmod 000；`acquireCompanyLease` 返回 acquired true（并删除锁）。

## 根因与证据

`parseHolder` 读失败/为空都折成 stale；无法区分「坏文件」与「不可读的活锁」。

## 失败类与同类排查

**失败类 = lease 的 fail-open 边界。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

读失败时 fail-closed（拒绝并发，给「lease 不可读」理由），不要 unlink；只有 EOF/坏 JSON 的显式 stale 才接管。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
