---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-125：`/deliverables audit` 对 symlink final 会 canonical 到目标：审计 x 却把账本写成 y

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（审计 symlink）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C4 / 审计账本）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

`deliverables/x/final.md` 是指向 `deliverables/y/final.md` 的 symlink（工作区内，非越界）。catalog 的 safe-file 会跳过 x（symlink 不跟随），但 `/deliverables audit` 的 `auditRelPath` 用 `canonicalPath` **跟随 symlink**：

```ts
setPresentedAudit(ws, '.dsh-company/deliverables/x/final.md', true)
→ ledger.paths = { '.dsh-company/deliverables/y/final.md': true }
→ ledger.slugs = { y: true }
→ path = '.dsh-company/deliverables/y/final.md'
```

用户明确审计 x，账本写的却是 y；x 的 `final.md` symlink 仍在、catalog 仍跳过 x、x 从未被审计。命令回执（handler 用 `result.path ?? parsed.path`）会显示 y，用户可能没注意。

同形：symlink final → 另一个目录 final 时，审计写入目标 slug；symlink 到 workspace 外则 canonical rel 以 `..` 开头，被拒（这条 OK）。

## 根因（假设）

- `auditRelPath` 的 `canonicalPath(absolute)` 解析了 symlink；返回的 `rel` 是**真实目标**，不是用户输入路径。
- `auditTargetProblem` 也用 `statSync`（跟随）；只有 `plainFileProblem`/catalog/`readTextInside` 用了 lstat 非 symlink。
- S2/BUG-108 的 symlink 修复覆盖 catalog 与 `/prd`/`/req`/`/delivery`，**没覆盖 audit**。

## 暴露的失败类

**审计路径 canonical 化把「用户审计的对象」换成「链接目标」**：审计是「对哪条路径背书」的语义；canonical 化后 path/slug 都变了，回执里的 path 还是另一个对象。同类：任何写账本/审计/背书的路径都要先决定 symlink 策略（拒绝，或保留用户路径）。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-audit-symlink-inside.mts
```

2026-11-13 输出：

```
{"ledger":{"paths":{".dsh-company/deliverables/y/final.md":true},"slugs":{"y":true}},"path":".dsh-company/deliverables/y/final.md"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `auditRelPath` 对输入路径做 `lstat` 逐段/最终：final 是 symlink → 返回 warning「审计目标不能是 symlink」，不 canonical 到目标。
- `auditTargetProblem` 改用 `plainFileProblem(companyRoot, path)`（非 symlink + realpath 在 root 内），和 catalog 同一判据。
- 若要支持链接，保留用户给的 lexical rel 写账本（不 canonical），并明确回执；但不能静默改写成目标 path/slug。
- 加 spec：x→y 内部链接、外部链接、普通 final、目录 final、审计回执 path 与 slug。

## 修复关联

- 发现于 S2 symlink 修复后的 C4 审计回归；与 [BUG-108](BUG-108-catalog-symlink-final-outside.md)（catalog 已拒 symlink）和 [BUG-099](BUG-099-deliverables-audit-nonexistent-final.md)（审计验目标）同面。
- 相关：`src/host/ledger/presented-ledger.ts` 的 `auditRelPath` / `auditTargetProblem`；`presented-domain.ts` 的 `auditLedger`。

## 已修判定

修成：`auditRelPath` 不再 canonical 化（保留用户 lexical 路径）；`auditTargetProblem` 用 `companyFileProblem` 拒绝 symlink/目录/越界；审计 x 不会写成 y。
- keyless：x→y 内部 symlink → warning，账本未写；红证：catalog 旧实现下 1 failed（同组 A）。
