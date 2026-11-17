---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-194：live 指针守卫不扫 `.js` 源码注释，JS 模块里的旧 spec 路径仍绿

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（pre-push 非 ASCII 路径被 git C-quote 误判「未分类」；归档 ×1912 与修复提交 ×1924 不符）已修复；建议 S1–S5 处置（尾注标签、审查落盘、passed 数校正、`--paths` 不支持项、docs/testing.md 合同行）
>
> **关联**：[探索卡 Round 93](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-187 的守卫（`tests/repo/docs/live-pointer-paths.spec.ts`）。
> **留痕**：Note [2026-11-16-guard-surfaces-not-samples.md](../../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)（本批共用）。

## 症状

`live-pointer-paths.spec.ts` 只递归 `packages/company-pack/src` 下的 `.ts` / `.tsx`；`src/**` 里的 `.js` 源码（如 `src/lib/docs/markdown-shape-core.js`）的注释不在扫描面。把一条不存在的 spec 路径写进该 JS 文件注释，spec 仍 6 passed——而源码注释同样会被 agent 当「去哪找证据」的活指针。

## 运行面

tooling / 活指针守卫（`tests/repo/docs/live-pointer-paths.spec.ts`）；不是运行时行为。

## 复现

```sh
cp packages/company-pack/src/lib/docs/markdown-shape-core.js /tmp/markdown-shape-core.js.bak
printf '\n// stale pointer probe: tests/lib/ledger-legacy.spec.ts\n' >> packages/company-pack/src/lib/docs/markdown-shape-core.js
pnpm test tests/repo/docs/live-pointer-paths.spec.ts   # 期望红，实际 6 passed
cp /tmp/markdown-shape-core.js.bak packages/company-pack/src/lib/docs/markdown-shape-core.js
```

实跑日志 = `runtime/tmp/c11/mut-live-js.log`（spec exit 0）。还原后 `git diff` 为空。

## 根因与证据

- **根因**：`filesUnder('packages/company-pack/src', ['.ts', '.tsx'])` 的后缀白名单漏了 `.js`；`markdown-shape-core.js` 是运行时零依赖手写扫描器，属于产品源码，不是测试夹具。
- **确认**：临时注入 → spec 绿；还原 → 绿（对照失败）。
- **同类载体**：`src/**` 的 `.mts/.cts` 当前不存在；`.js` 只有这一个，但判据是白名单，新增一个 `.js` 仍会漏。

## 失败类与同类排查

**失败类 = 文档指针**（守卫的载体后缀不完备）。

同类：`built-path-literals.spec.ts` 也按后缀白名单（`.mjs`）；`typecheck-coverage-claim` 按文档集合；本族问题是「判据名覆盖 live 载体，实现只覆盖一个后缀/目录」。

## 修复方案与范围

- spec 的源码面后缀加 `.js`（必要时 `.mjs`），并对 `src/**` 全部可读文本扫描；负例 = JS 注释注入旧 spec → 红。
- 若担心 `.js` 里的第三方复制代码，按文件清单排除并登记，而不是整后缀跳过。
- 明确不改：不修改 `markdown-shape-core.js` 的行为。

## 已修判定

向 `markdown-shape-core.js` 注入 tests/lib/ledger-legacy.spec.ts → `pnpm test tests/repo/docs/live-pointer-paths.spec.ts` 红；还原 → 8 passed。`node runtime/tmp/c11/live-pointer-check.mjs` 仍 exit 0（现有活指针未新增）。

## 修复证据

- 改动面：`tests/repo/docs/live-pointer-paths.spec.ts`
- 红：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts`（旧 SOURCE_SUFFIXES：源码面 `.js` 用例红）
- 绿：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts`（8 passed；SOURCE_SUFFIXES 含 `.js/.mjs`）
- 提交：commit 34f84fd2
