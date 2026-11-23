---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-349：`/cultivation revoke` 筛选记录漏判 `revokedAt === undefined`，再次撤回同名方法会覆盖历史撤回时间

> 严重级别：P2（审计历史破坏：同一角色的方法 slug 曾被采纳并撤回后，若后续再次采纳该 slug 并再次执行 `/cultivation revoke`，旧记录的 `revokedAt` 会被连带覆盖成新时间戳）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

在 [`cultivation.ts`](../../packages/company-pack/src/host/cultivation/cultivation.ts#L402-L407) 的 `commandRevoke` 中收集 `pendingRecords` 时，过滤条件是：

```ts
if (record.status !== 'adopted' || record.methodSlug !== slug || record.targetRole !== face.role) continue
```

它**没有**检查 `record.revokedAt === undefined`（而同文件 [`commandCheck`](../../packages/company-pack/src/host/cultivation/cultivation.ts#L655) 明确写了 `record.status === 'adopted' && record.targetRole === face.role && record.revokedAt === undefined`）。因此当同一个 `(targetRole, methodSlug)` 历史上被采纳并撤回过一次（旧记录保持 `status: 'adopted'` 且带 `revokedAt: T1`），之后该 slug 再次创建/采纳新记录并再次 `/cultivation revoke` 时，旧记录会被一并写入 `pendingRevoke` 并在 commit 时把 `revokedAt` 从 `T1` 覆盖为 `T2`。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/cultivation/cultivation.ts`](../../packages/company-pack/src/host/cultivation/cultivation.ts#L402-L407)。

## 复现

用临时 `cultivationRoot` + `workspace` 写入方法 `retry-check` 及两条同 `targetRole: 'ceo'`、同 `methodSlug: 'retry-check'` 的 `adopted` 记录：
- `r-old`：已带历史 `revokedAt: '2026-01-01T00:00:00.000Z'`；
- `r-new`：未撤回（无 `revokedAt`）；

调用 `handleCultivationCommand('/cultivation revoke retry-check', ...)` 后再读回两条记录：
- 实测 `r-old.revokedAt` 从 `'2026-01-01T00:00:00.000Z'` 被静默篡改成了本次撤回的新时间戳（与 `r-new.revokedAt` 相同）。

## 根因与证据

1. 撤回记录保留 `status: 'adopted'` 并通过附加 `revokedAt` 表达已撤回状态；[`commandCheck` 第 655 行](../../packages/company-pack/src/host/cultivation/cultivation.ts#L655) 已过滤 `record.revokedAt === undefined`，但 [`commandRevoke` 第 404 行](../../packages/company-pack/src/host/cultivation/cultivation.ts#L404) 漏掉同一条件，导致把已撤回的历史记录当成待撤回记录二次写入 `revokedAt`。

## 失败类与同类排查

- **失败类**：同一业务谓词（"当前仍处于生效中的已采纳记录"）未抽共享判断，各命令手写过滤条件漏掉 `revokedAt === undefined`。
- **同类排查**：需对照检查 `cultivation` 相关命令及 `lib/cultivation/` 中所有过滤 `status === 'adopted'` 的位置是否都排除了 `revokedAt !== undefined`。

## 修复方案与范围

- **根因修法**：在 `commandRevoke` 第 404 行补充 `|| record.revokedAt !== undefined`（或抽成共享谓词 `isActiveAdoptedRecord(record, role)` 并由 `commandCheck` 与 `commandRevoke` 共用）。

## 已修判定

- 历史已撤回记录与新采纳记录共享同 `(targetRole, methodSlug)` 时，对新记录执行 `/cultivation revoke` 只更新新记录的 `revokedAt`，历史记录的 `revokedAt` 原封不动。
