---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-090：方法层是 home 级、records 是 workspace 级，`/cultivation revoke` 只读当前 workspace：records 不可达或方法在别 workspace 时仍删方法并报「标记 0 条记录」

> 严重级别：P1（重要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C1 / H-cross）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

`/cultivation revoke <slug>` 在两种情况下会删除**仍被采纳记录引用**的方法，且回执说「标记 0 条记录」：

1. **records 目录不可达**：workspace 里根本没有 `.dsh-company/cultivation/records/`（新 workspace / 搬家 / 权限坏），方法层里有一个已部署方法：
   - `revoke orphan-method` → `kind:success`，方法目录被删；
   - 再 `check` → `记录目录不可达：…`；
   - 删除前没有任何记录被标记、没有 pending journal、没有回滚材料。
2. **同 home 多 workspace**：workspace A 采纳方法 `cross-method`（方法层在 home）；workspace B 打开 `/cultivation check`：
   - 报 `方法无记录 cross-method`（B 的 records 里当然没有 A 的采纳）；
   - B 执行 `revoke cross-method` → `kind:success`，删除 A 的方法，回执「标记 0 条记录」；
   - A 再 `check` → `记录缺方法 <id>（缺方法 cross-method）`。

## 根因（假设）

- `commandRevoke` 直接 `storage.loadRecords(recordsDir).records`，**没有检查 `loaded.reachable`**（`src/host/cultivation/cultivation.ts:345` 附近）；`loadRecords` 对缺失目录返回 `{ records: [], reachable: false }`，于是「不可达」被当成「0 条记录」。
- 方法层在 `<DSH_HOME>/company/methods/`（home 级），records 在 `<workspace>/.dsh-company/cultivation/records/`（workspace 级）；revoke/check 都没有跨 workspace 的全局记录视图，也没有「这个方法属于哪个 workspace」的判据。
- `check` 同样只看当前 workspace 的 records，所以把另一 workspace 采纳的方法报成「方法无记录」——这是 B 里 revoke 的诱导入口。

## 暴露的失败类

**作用域不一致 + 破坏性命令把「当前视图为空」当成「全局为空」**：方法层是 home 级、记录是 workspace 级，命令却按当前 workspace 做完整性判断；`revoke` 的删除没有「records 可达」前置，也没有「方法在别处有采纳记录」的全局证据。同一根因还会出现在 archive/verify 等按 workspace 取 records 的命令。

## 复现

```sh
node --import tsx/esm runtime/tmp/c1-revoke-norecords.mts
node --import tsx/esm runtime/tmp/c1-cross-workspace.mts
```

2026-11-12 原始输出（节选）：

```
# 1) records 目录缺失
revoke {"kind":"success","text":"已撤回方法 orphan-method（…；标记 0 条记录）…"}
method still? false
check {"kind":"error","text":"记录目录不可达：…/ws/.dsh-company/cultivation/records"}

# 2) 同 home 两个 workspace
A adopt → success
B check → "…方法无记录 cross-method…"
B revoke → "…标记 0 条记录…"
A check after B revoke → "记录缺方法 <id>（缺方法 cross-method）"
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- **最小修**：`commandRevoke` 在 `loadRecords` 后先判 `reachable`，不可达直接报错、不删方法；任何跨 workspace 的「0 条记录」也不得直接删除，至少要求显式 `--orphan`/二次确认。
- **作用域拍板**：方法层要么跟着 workspace 走（records 与方法同盘），要么建立 home 级的方法→记录索引（records 也迁 home 或导出索引）；当前一半 home 一半 workspace，check/revoke 天然对不齐。
- `check` 在另一 workspace 的方法应标「不在本 workspace 的 records 视图中」，不直接叫「无记录」；只有确认全局无记录才是孤儿。
- 加 keyless spec：① records 目录缺失 revoke 必须红/拒；② 同 home 两 workspace 的 adopt / check / revoke 不互相误删；③ 删除前 pending journal 与回滚仍成立。

## 修复关联

- 发现于 C1；同族数据诚实条款见 [cultivation 合同](../../../docs/contracts/cultivation.md)（「不可达 ≠ 0」）。
- 相关：`cultivation-storage.loadRecords` 的 `reachable` 面；`commandCheck` / `commandArchive` 已检查，`commandRevoke` 没检查。

## 已修判定

修成：`/cultivation revoke` 先判 records 可达；不可达直接拒绝、不删方法。本 workspace 0 条采纳记录时默认拒绝（方法层 home 级、records workspace 级，0 条 ≠ 全局无记录），只有显式 `revoke <slug> --orphan` 才删；回执点名是哪一种。

- keyless：records 目录缺失 → error 且方法保留；0 记录 → error 含 `--orphan`；`--orphan` → success 且删目录。
- 红证：去掉 reachable/orphan guard → 2 failed；复原 15 passed。
