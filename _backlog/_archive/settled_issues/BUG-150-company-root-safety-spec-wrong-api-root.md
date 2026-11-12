---
status: 已结
severity: P2
opened: 2026-11-13
---

# BUG-150：`company-root-safety.spec.ts` 把 `join(workspace,'.dsh-company')` 传给要求 workspace 的 catalog/presented API，2 条假红

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已结｜审查：agent — 复核不成立：当前 spec 已传 workspace，55 passed；无产品改动
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 测试资产）
> **留痕**：Note [2026-11-13-last-direct-writers](../../../notes/implemented/2026-11-13-last-direct-writers.md)

## 症状

A 新增的 `tests/host/contract/company-root-safety.spec.ts` 写入口：

```ts
run: (workspace) => regenerateCatalog(join(workspace, '.dsh-company'))
run: (workspace) => writePresentedLedger(join(workspace, '.dsh-company'), LEDGER)
```

但 `regenerateCatalog` / `writePresentedLedger` 的参数是 **workspace**（内部再 `companyHomeOf(workspace)=workspace/.dsh-company`），不是 companyHome。当前 spec 跑：

```
FAIL catalog.regenerate > root-symlink-out：不写 outside，失败必须 typed
FAIL presented.write > root-symlink-out：不写 outside，失败必须 typed
AssertionError: … 在 root-symlink-out 下写到了 outside
```

实际是**双重 `.dsh-company`**：API 在 `workspace/.dsh-company` 里又建 `.dsh-company`，形状矩阵把 outside 快照差异算到写入口头上。startup/bootstrap 用 workspace，所以只这两个假红。

## 根因（假设）

- `catalog.ts` / `presented-ledger.ts` 的参数历史上叫 `companyHome`，但 company-root 迁移后实际语义是 `workspace`；spec 按旧名字传 `.dsh-company`。
- 没有类型/运行时判据区分「workspace」与「companyHome」；同名参数导致误用。
- spec 的 negative 断言把这种误用报成产品写外，可能诱导错误修复。

## 暴露的失败类

**API 参数命名与实际语义漂移**：`companyHome` 名字留在函数签名，调用方按名字传 companyHome；company-root 内部按 workspace 解释，双重前缀。需要统一命名/类型（`WorkspacePath`/`CompanyHomePath`）或在 API 入口校验。

## 复现

```sh
npx vitest run tests/host/contract/company-root-safety.spec.ts
```

2026-11-13 输出（节选）：

```
× catalog.regenerate > root-symlink-out：不写 outside，失败必须 typed
× presented.write > root-symlink-out：不写 outside，失败必须 typed
AssertionError: … 写到了 outside
```

## 修复方向（未授权）

- spec 改为传 `world.ws`（workspace）给 `regenerateCatalog`/`writePresentedLedger`；或把两个 API 的参数重命名为 `workspace` 并更新签名。
- 若要支持 companyHome 入口，提供显式 `regenerateCatalogAt(companyHome)`/`writePresentedLedgerAt(companyHome)` 和类型区分；不要同名混用。
- 加契约测试：workspace 版与 companyHome 版各自 pass；root symlink 下都 typed refusal。
- 147/148/149 knownGap 的 spec 备注仍有效；先修这个假红再收口。

## 修复关联

- 发现于 BUG-147/148/149 的 safety 矩阵；与 [BUG-147](../fixed_bugs/BUG-147-export-governance-symlink-root-writes-outside.md) / [BUG-148](../fixed_bugs/BUG-148-bundle-manifest-root-symlink-writes-outside.md) / [BUG-149](../fixed_bugs/BUG-149-cultivation-root-symlink-writes-outside.md) 不同：本卡是**测试误用**，不是产品写外。
- 相关：`tests/host/contract/company-root-safety.spec.ts`、`src/host/ledger/catalog.ts`、`presented-ledger.ts`。
