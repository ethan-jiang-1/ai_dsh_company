---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-227：release:shape 只判 tarball，不比对源码/HEAD；旧 _dist 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 指纹闭包 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C14 低置信卡](../../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-5 / G2）。
> **留痕**：批次 Note [2026-11-18-shipped-shape-closure-and-low-confidence-runtime](../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)（本批共用）。

## 症状

`pnpm release:shape` 是 C13 修复新增的手动入口，但它只做一件事：`readTarball(tarball)` → `checkShippedPackage()`。它**不读** `_dist/release-manifest.json` 的 `gitSha`/`sourceFingerprint`，也不看 HEAD。实测：

```text
_dist/release-manifest.json: gitSha a692bf58…, sourceFingerprint 31519262…
HEAD:                       ba0afd61
pnpm release:shape:         PASS（137 entries）
```

`_dist` 不是由当前 HEAD 构建的（a692bf58 ≠ ba0afd61），shape 仍 PASS。若某次改源码后忘记 `pnpm release --prepare`，`release:shape` 会给旧包盖「形状 OK」的章。

## 复现

```sh
node -e "const m=require('./_dist/release-manifest.json'); console.log(m.gitSha, m.sourceFingerprint)"
git rev-parse --short HEAD
pnpm release:shape
```

实测三者如上；`release:shape` 退出 0。`tools/release/shipped-shape.mjs` 只 import `checkShippedPackage` 与 `readTarball`，没有任何源码指纹输入。

## 根因与证据

- 根因：`release:shape` 的语义被写成「对现有 `_dist` 复跑判据」，但入口名/Note 把它当发布门禁用；没有「tarball 由当前源码构建」的新鲜度判据。
- 证据：上命令；[shipped-shape.mjs](../../../tools/release/shipped-shape.mjs)；`_dist/release-manifest.json` 的 `gitSha`/`sourceFingerprint`。
- 影响：false green 出现在**最需要可信的发布门禁**上；`release --prepare` 自己会重打（所以发布路径不坏），但手工/CI 的 `release:shape` 会给旧包背书。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（输入新鲜度未证）。

同类：BUG-228（真实 tarball 检查不在 verify/pre-push）；BUG-223/226（checker 面缺口）。

## 已修判定

修成什么算修好：

1. `pnpm release:shape` 读 `_dist/release-manifest.json` 的 `sourceFingerprint`，与当前源码指纹不等即红并提示 `pnpm release --prepare`；`--allow-stale` 是显式降级。
2. `gitSha` 落后但源码指纹相同（docs-only 提交）只打印 note，不误红。
3. 最小负例：旧 `_dist` + 新源码 → 红；prepare 后 → 绿。

## 修复证据

- 改动面：`tools/release/shipped-shape.mjs`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（manifest.sourceFingerprint deadbeef… ≠ 当前源码 → exit=1（日志 runtime/tmp/c14-fix-shape-red.log））
- 绿：`pnpm release:shape`（sourceFingerprint 匹配 → PASS（日志 runtime/tmp/c14-fix-shape-green.log））
- 提交：commit 87d8b15d
