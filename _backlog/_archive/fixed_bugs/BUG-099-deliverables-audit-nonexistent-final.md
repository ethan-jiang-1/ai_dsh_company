---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-099：`/deliverables audit` 接受不存在的 `final.md`，`true` 还会把 slug 写进账本，未来同 slug 成品自动继承「已 present」

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C6 / 命令解析）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

```ts
setPresentedAudit(ws, '.dsh-company/deliverables/nope/final.md', true)
→ { ledger: { paths: { '.dsh-company/deliverables/nope/final.md': true },
              slugs: { nope: true } }, path: ... }
```

`nope/final.md` **根本不存在**；账本仍写 `paths` + `slugs.nope=true`。随后创建 `deliverables/nope/final.md` 并 `regenerateCatalog`：

```
catalog entry: { slug:'nope', path:'.dsh-company/deliverables/nope/final.md', presented: true }
```

新成品没有 `deliverables/presented` 事件，也没有人重新审计，却直接显示「已 present」——一次 typo 或提前审计会变成未来的自动背书。`false` 同理可提前把 slug 的精确 path 记为未 present（虽然 false 不写 slug，但精确 path 会在未来文件出现时命中）。

## 根因（假设）

- `auditRelPath`（`src/host/ledger/presented-ledger.ts`）只校验路径形状：`normalizeRel` 后匹配 `^(\.dsh-company/deliverables|deliverables-archive)/<dir>/final\.md$`；**不检查文件是否存在、是否是普通文件**。
- `setPresentedAudit` 直接写账本；`true` 分支按父目录写 `slugs[dir]=true`（这是为归档/搬迁延续背书设计的），于是「不存在的 path」也会把 slug 预置为 true。
- 命令 `/deliverables audit` 没有额外存在性检查；回执照样 success。

## 暴露的失败类

**审计入口只校验「看起来像一条 final.md」，不校验「这条 final.md 真的存在」**：`true` 的 slug 延续语义把一次路径 typo 放大成未来同 slug 的自动背书。审计/背书类命令要区分「当前存在的对象」与「未来可能出现的同 slug」。

## 复现

```sh
node --import tsx/esm runtime/tmp/c6-audit-nonexistent.mts
```

2026-11-13 原始输出（节选）：

```
audit missing -> {"ledger":{...,"paths":{".dsh-company/deliverables/nope/final.md":true},"slugs":{"nope":true}},...}
# 创建 nope/final.md 后
catalog entry -> {"slug":"nope",...,"presented":true}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `auditRelPath`（或 `setPresentedAudit`）要求目标 `final.md` 是**普通文件**（`lstatSync(...).isFile()`）；不存在给可操作错误（「先落 final.md 再审计」）。
- 如果产品确实要允许「提前审计」：`true` 的 slug 写入应与「文件存在」绑定；不存在的 path 只记精确 path，不写 slug，且回执明说「文件不存在，仅记录路径结论」。
- 命令 `/deliverables audit` 的 error 文案点名 `final.md` 缺失；加 spec：不存在 path、目录 final.md、归档路径、合法 true/false。

## 修复关联

- 发现于 C6；与 [BUG-096](BUG-096-deliverables-catalog-directory-eisdir.md) 同属成品目录的「存在 ≠ 是可读文件」边界。
- 合同：[`docs/contracts/cultivation.md`](../../../docs/contracts/cultivation.md) 之外的 presented 账本语义 = [`docs/contracts/data-model.md`](../../../docs/contracts/data-model.md)。

## 已修判定

修成：`auditRelPath` 之后新增 `auditTargetProblem`：审计目标必须是**当前存在的普通文件**；不存在/目录 → 可操作 warning（「先落 final.md 再审计」），不写账本 path、不预置 slug。`auditLedger` 与 `setPresentedAudit` 共用。

- keyless：不存在 final → ledger undefined + warning；final 是目录 → 拒绝；合法文件仍可 true/false 并带 slug。
- 红证：去掉目标检查 → 2 failed；复原 19 passed。
