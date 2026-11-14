---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-179：walkCompanyDirs 拒绝所有 `..` 段，包括仍留在公司盘内的路径

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 91](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-170 修越界 `..` 时采取「全量拒绝」，把内部 `..` 也误杀。
> **留痕**：Note [2026-11-14-shape-fences-and-gate-parsing.md](../../../notes/implemented/2026-11-14-shape-fences-and-gate-parsing.md)（同轮八卡）；复现脚本 = `runtime/tmp/c9d-read-internal-dotdot.mts`。

## 症状

公司盘内一条先上跳再回到公司盘内的相对路径：

```text
deliverables/x/../y/meta.md
```

（`x` 与 `y` 都在 `.dsh-company/deliverables/` 下，`y/meta.md` 存在）

`readCompanyFileAt(companyHome, 'deliverables/x/../y/meta.md')` 返回：

```text
{ kind: 'unsafe', reason: '...公司盘路径不能含 .. 段（越出根）：deliverables/x/../y' }
```

同一目标用规范路径 `deliverables/y/meta.md` 返回 `{ kind: 'text', text: 'ok' }`。

## 根因（假设）

`walkCompanyDirs()` 在 BUG-170 修复中改成「segments 里任何 `..` 一律 Unsafe」，注释说「越出根」；但它没有先规范化路径/判断 `..` 是否真的越出。`a/../b` 这类仍落在 root 内的路径被误报 unsafe。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9d-read-internal-dotdot.mts
```

看 `a/../b { kind: 'unsafe' }` 与 `normal { kind: 'text' }`。

## 影响 / 失败类

**失败类 6/8（持久化 + 文件形状）**：任何调用方传「先上跳再回到盘内」的等价路径都会被拒绝；`prd-gate` 目前用受控 rel 不受影响，但 `readCompanyFileAt` 是导出契约，未来读者会踩。与 BUG-170 的越界漏判方向相反：这次是内部 `..` 误杀。

## 修复方向（不在本卡实施）

- 先把 `rel` 规范化（`path.posix.normalize`）并判断是否仍在 companyHome 内；越出才 unsafe；
- 或对 `..` 段做栈式消解，栈空再遇 `..` 才拒绝；
- spec 覆盖 `a/../b`（允许）、`../outside`（拒绝）、`a/../../outside`（拒绝）。

## 已修判定

```text
内部 `..`（`deliverables/x/../y/meta.md`）按栈消解为盘内路径 → text；`../outside`、`a/../../outside` 仍 unsafe
`companyFileProblemAt` / `readCompanyTextAt` 同判；不回归 BUG-170 的越界拒绝
红证：还原「任何 .. 一律拒绝」→ 内部路径红
```

判据由 `tests/host/contract/file-shape-agreement.spec.ts` 的内部/越界用例搭载；红证 = 还原全量拒绝。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/company-root.ts`、`tests/host/contract/file-shape-agreement.spec.ts`
- 红：还原「任何 .. 一律拒绝」→ `npx vitest run tests/host/contract/file-shape-agreement.spec.ts` 红（内部 .. 误杀）
- 绿：改栈式消解 → `npx vitest run tests/host/contract/file-shape-agreement.spec.ts` 绿（22 passed）
- 提交：commit 8a95fc51

## 证据

- `runtime/tmp/c9d-read-internal-dotdot.mts` / `.log`：内部 `..` → unsafe；规范路径 → text。
- 代码：[company-root.ts](../../../packages/company-pack/src/host/run-bundle/company-root.ts) 的 `walkCompanyDirs()`。
