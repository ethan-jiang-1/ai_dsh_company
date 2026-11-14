---
status: 修复就绪
severity: P1
opened: 2026-11-13
---

# BUG-156：present 闸门在 meta/drafts 不可读（symlink/越界）时静默放行

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 86](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8-H5/H6）；与 BUG-129/131/134/147/149 同族的「新增读载体未接 company-root」。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8-round1.mts`。

## 症状

两种形状都让闸门 **allow**，而实际交付物的 PRD 是坏的：

1. **`deliverables` 根是 symlink → 外部目录**：`readTextInside(companyRoot, …/deliverables/w/meta.md)` 的 `realpath` 越出 companyRoot → 返回 undefined；闸门把 undefined 当「旧动议」跳过。`present` 仍能按路径解析并交付外部 `final.md`。
2. **`meta.md` 叶子是 symlink → 外部文件**：`plainFileProblem()` 返回 `symlink` → `readTextInside` 返回 undefined；同样跳过。

keyless 输出：`gate symlink deliverables root allow`、`gate symlink meta allow`；同一坏 PRD 的 `validateProductDocs` 是 `false`。

## 根因（假设）

- `prd-gate.ts` 用 `readTextInside` 读 meta/MRD/PRD；该 helper 对 `missing` / `symlink` / `outside` / `not-file` 一律返回 `undefined`。
- 闸门把 `undefined` 只解释为「旧动议（没有 meta/numbering）」；没有区分 **missing**（合法豁免）与 **unsafe/坏形状**（必须拒绝或 fail loud）。
- 闸门不经过 `company-root` 的根/子目录 residency；`deliverables` 根被 symlink 时根本身没有被验证。矩阵目前只登记写入口，`prd-gate` 这个新读载体没有进 agreement / carrier。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8-round1.mts
```

看 `gate symlink deliverables root allow` 与 `gate symlink meta allow`；临时 workspace 内创建 `deliverables -> outside-deliverables` 与 `meta.md -> outside-meta.md`。

## 影响 / 失败类

**失败类 6/8（持久化 + 文件形状）**：present 闸门是新增的读载体；symlink/越界使它 fail-open，坏 PRD 可通过。与 BUG-129/131/134/147/149 的根因同族，但这次是**读面 + 新载体**，说明矩阵的「读载体登记」缺口仍未收口。

## 修复方向（不在本卡实施）

- 把 `readTextInside` 的 `undefined` 拆成 typed problem：`missing` → 旧动议豁免；`symlink` / `outside` / `not-file` → deny 或 fail loud，不能当旧动议。
- 闸门先做 company-root 根/子目录 residency（或消费同一个 `companyFileProblem`），再读 meta/drafts。
- 把 `prd-gate` 登记的读载体加进 `file-shape-agreement` / `carrier-registry`，并补 spec：deliverables 根 symlink、meta 叶子 symlink、drafts symlink。

## 已修判定

```text
deliverables 根 symlink → 外部目录   → deny（reason = 形状不安全），不再当旧动议
meta.md 叶子 symlink → 外部文件      → deny
drafts/ 下 mrd/prd 叶子 symlink      → deny
meta 缺失（真没写）                  → allow（旧动议豁免；保持）
```

读取判据 = `readCompanyFileAt()` 的三态（text / missing / unsafe）：missing 才豁免，unsafe 一律 deny。该载体同 diff 登记进 `tools/lib/carrier-registry.mjs`（reader / `file-shape-agreement`）并加入 `tests/host/contract/file-shape-agreement.spec.ts` 的 READERS。红证 = 把 unsafe 折回 undefined → 三种 symlink 用例变 allow。

## 证据

- `runtime/tmp/c8-round1.mts`：`gate symlink deliverables root allow`、`gate symlink meta allow`。
- 代码：[prd-gate.ts](../../packages/company-pack/src/host/commands/prd-gate.ts#L82)、[safe-file.ts](../../packages/company-pack/src/host/fs/safe-file.ts#L41)、[carrier-registry.mjs](../../tools/lib/carrier-registry.mjs)。
