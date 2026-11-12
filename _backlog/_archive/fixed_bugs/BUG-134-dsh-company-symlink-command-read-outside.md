---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-134：`.dsh-company` 是 symlink 时 `/prd` `/req` `/delivery` 会把 workspace 外文档当内部文档读并通过

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（命令根）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C6 / 交付物读路径）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`.dsh-company` 指向 workspace 外目录，`outside/deliverables/x/drafts/{mrd,prd}.md` 存在：

```ts
registerPrdCommand(..., { workspace: ws, dataBlocked:false })
/prd check x
→ {"kind":"success","text":"PRD 校验通过（x）：1 个机会 / 1 条需求 / 1 条验收。"}
```

即：操作员命令把 workspace 外的文档当成了公司盘交付物读取并通过。`resolveDeliverablePath` 的 `lstat(root)` 跟随父目录 symlink（`.dsh-company`），`isInside(companyRoot, root)` 的 companyRoot 也是外部真实路径，前后缀比较通过；S2 的 `readTextInside` 只拒绝**叶子文件** symlink，root 已是外部时它比较的 root 也是外部，无法发现。

同族：`/req`、`/delivery`、catalog 读面；BUG-129 已记写面，BUG-131 记 `kb` 子目录写面；本条是**根级读面**。

## 根因（假设）

- `resolveDeliverablePath` 只校验 slug + `relative` 形状，不做 `.dsh-company` 根的 `lstat`/realpath residency。
- `readTextInside(companyRoot, path)` 以 `companyRoot` 为信任根；根本身是 symlink 时，realpath 前缀比较仍在「外部根」内。
- 没有共享 `resolveCompanyRoot`（BUG-129/131 的建议）同时服务读写。

## 暴露的失败类

**信任根本身没被验证**：读/写都假设 `.dsh-company` 是 workspace 内的普通目录；一旦根是 symlink，叶子检查（symlink、realpath 在 root 内）都相对错误根，仍通过。residency 必须先验证根。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-company-root-read.mts
```

2026-11-13 输出：

```
{"kind":"success","text":"PRD 校验通过（x）：1 个机会 / 1 条需求 / 1 条验收。"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `resolveCompanyRoot(workspace)`：lstat `.dsh-company`；symlink → 拒绝（或 realpath 必须在 workspace 内）；非目录 → 拒绝。所有命令/catalog 先取它。
- `resolveDeliverablePath` 用它作为 companyRoot，并在 `readTextInside` 前再次 realpath 前缀。
- 与 BUG-129/131 的 `resolveCompanyRoot` 合并；读写共用同一根判据。
- 加 spec：`.dsh-company` symlink→外部/内部、正常目录；`/prd` `/req` `/delivery` 的 success/error 与外部字节不动。

## 修复关联

- 发现于 BUG-129（写面根 symlink）后的读面检查；与 [BUG-129](BUG-129-dsh-company-symlink-root-writes-outside.md) / [BUG-131](BUG-131-kb-symlink-catalog-writes-outside.md) 同族，但本卡是**命令读面**。
- 相关：`src/host/commands/deliverable-path.ts`、`prd-command.ts`、`req-command.ts`、`delivery-command.ts`。

## 已修判定

修成：`resolveDeliverablePath` 先 `ensureCompanyRoot(workspace)`，根 symlink → error；`/req` 同样在解析前取安全根；`/prd` `/req` `/delivery` 不再把外部交付物当内部。
- keyless：`.dsh-company` symlink→外部 + 外部 mrd/prd → `/prd` error 含 symlink；红证：旧 resolve 只比 realpath 时 success（修复前实测）。
