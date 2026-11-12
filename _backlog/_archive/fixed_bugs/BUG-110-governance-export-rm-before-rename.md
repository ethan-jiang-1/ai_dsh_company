---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-110：`exportGovernance` 的目录替换先 `rm` 旧导出、再 `rename` staging；中途失败会丢掉上一份可用导出

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 治理导出）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`atomicReplaceDir` 的实现：

```ts
cpSync(source, staging, { recursive: true, dereference: false })
rmSync(target, { recursive: true, force: true })
renameSync(staging, target)
```

名字叫 atomic，但**目标目录在 rename 之前已经被删除**。若 `renameSync` 失败（权限变化、跨设备、target 父目录被改、同名目录竞争等）或进程在 rm/rename 之间崩溃：

- 新导出没就位；
- 上一份 `exports/methods/` 已经没了；
- `exportGovernance` 只 catch 成 warning，用户手里两份都没有。

`exports/README.md` 与 `ledger.json` 不是同一原子单元：README 先写、methods 后替换、ledger 再写，失败会留下混合代。

## 根因（假设）

- `rename` 是原子替换文件/空目录，但**不能覆盖非空目录**；实现用「先删再 rename」绕过，失去原子性。
- 没有「旧目录改名到 backup → rename staging → 成功后删 backup」的两阶段；也没有失败回滚。
- 三个导出件各自写，没有整体 staging 目录（整个 `exports/` 一起替换才是一个快照）。

## 暴露的失败类

**「atomic」只对文件/空目录成立；非空目录替换被实现成先删后建**。发布/导出类路径的原子性要以「整个输出目录 staging + 旧版 backup」为单位，不能逐件替换。

## 复现

静态可判；运行时可在 `rmSync(target)` 后让 `renameSync(staging,target)` 失败（target 父目录只读/被占）观察 `exports/methods` 丢失。当前 `exportGovernance` 返回 `{methods:false,warnings:[…]}`，但旧快照已删。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- 整个 `exports/` 用 staging：先生成 `exports.tmp-*`（README + methods + ledger），成功后把旧 `exports` rename 为 `exports.bak-*`，再 rename staging→exports，最后删 backup；失败恢复 backup。
- 或至少 methods：`rename(target, backup)` → `rename(staging,target)` → 成功删 backup；失败 rename backup 回去。
- `ledger.json` 也走同一 staging，避免 README/methods/ledger 混代。
- 加 spec：模拟 rename 失败，断言旧导出仍在 / 回滚成功。

## 修复关联

- 发现于 C4；与 [BUG-100](BUG-100-export-dist-deletes-old-before-pack.md) 同属「先删后建」的发布失败路径，但本卡在 runtime 导出。
- 相关：`src/host/ledger/governance-export.ts` 的 `atomicReplaceDir`。

## 已修判定

修成：`exportGovernance` 整个 `exports/` 在 staging 生成（README + methods + ledger），成功后 `swapDirWithBackup`：target→backup、staging→target；第二步失败把 backup 恢复，旧快照不丢。

- keyless：注入第二次 rename 失败 → 旧 exports 内容仍在、无残留 backup；正常导出/幂等仍绿。
- 红证：先删后 rename 版 → 1 failed；复原 3 passed。
