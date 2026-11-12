---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-139：`/cultivation verify` 不检查 `revokedAt`：方法已撤回仍可回填「有用/没用」，与「采纳后验证」状态机冲突

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（verify revoked）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / 培养状态机）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

先采纳、再撤回方法，然后对同一条记录执行 `verify`：

```
adopt  → success（方法 m1 部署）
revoke m1 → success（删除方法 m1；标记 1 条记录）
verify <id> pass :: 后续相似工作
→ success「已记录后续工作依据并回填验证：<id> → 有用。」
```

`commandVerify` 只检查 `record.status === 'adopted'`；撤回只写 `revokedAt`，**不改 status**。所以记录同时是：

- `status: adopted`
- `revokedAt: …`
- `verification: pass`

方法已经不加载；「后续相似工作」不可能再用到它。回执还说「失败观察不会自动撤回方法」——方法已经撤回，语义自相矛盾。

契约：[`docs/contracts/cultivation.md`](../../../docs/contracts/cultivation.md) 说验证是「采纳 → 同类任务验证回填」；撤回后方法不再生效，verify 应拒绝（或明确「历史观察，不代表当前方法」）。

## 根因（假设）

- `commandVerify` 只判 `status`，不判 `revokedAt`；状态机实际是 `adopted` + `revokedAt` 二字段，verify 只看一半。
- `commandCheck` 已排除 revoked；`verify` 没有同步。
- 没有「revoked 记录还能不能验证」的产品决定；当前行为是隐式的「能」。

## 暴露的失败类

**撤回是附加字段，不是状态迁移**：`status` 仍 adopted，所有只判 status 的命令（verify）继续把记录当活跃方法。撤回后的记录应有显式只读/历史语义，或命令侧统一判 `revokedAt`。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-verify-revoked.mts
```

2026-11-13 输出（节选）：

```
adopt … success
revoke m1 … success（删除方法）
verify … success「已记录后续工作依据并回填验证：… → 有用。」
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `commandVerify` 读到 `record.revokedAt !== undefined` → `{kind:'error', text:'方法已撤回，不能再回填验证；如需保留历史观察，请另开记录/字段'}`。
- 或产品决定允许「撤回后历史验证」：明确写进 contract，并在回执/UI 标注「历史验证，方法未加载」，不要与活跃方法混用。
- `check`/`verify`/`reject` 等只判 status 的命令统一 `isActiveAdopted(record)` 判据；加 spec：revoked + verify pass/fail、active + verify、rejected + verify。

## 修复关联

- 发现于 C1 状态机回归；与 [BUG-091](BUG-091-cultivation-check-revoked-broken-unsafe.md)（check 排除 revoked 已修）同面，但本卡是 verify 的状态迁移。
- 相关：`src/host/cultivation/cultivation.ts` 的 `commandVerify`；`docs/contracts/cultivation.md`。

## 已修判定

修成：`commandVerify` 在 status=adopted 之后检查 `revokedAt`，已撤回 → error「方法已撤回，不能再回填验证」，与 check 排除 revoked 一致。
- keyless：adopt→revoke→verify → error；红证：HEAD cultivation → 3 failed。
