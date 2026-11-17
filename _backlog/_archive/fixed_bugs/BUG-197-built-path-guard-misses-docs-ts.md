---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-197：构建产物字面量守卫不扫 docs / `.ts`，文档里的旧 built 路径仍绿

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（pre-push 非 ASCII 路径被 git C-quote 误判「未分类」；归档 ×1912 与修复提交 ×1924 不符）已修复；建议 S1–S5 处置（尾注标签、审查落盘、passed 数校正、`--paths` 不支持项、docs/testing.md 合同行）
>
> **关联**：[探索卡 Round 93](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-185 的守卫（`tests/repo/structure/built-path-literals.spec.ts`）。
> **留痕**：Note [2026-11-16-guard-surfaces-not-samples.md](../../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)（本批共用）。

## 症状

`built-path-literals.spec.ts` 只扫 `checks/`、`tools/`、`probes/` 的 `.mjs`。向 `docs/testing.md` 追加一条不存在的 packages/company-pack/lib/types/lib/ghost.js，spec 仍 2 passed。文档里的构建路径同样会被 agent 当「去哪找产物」的证据。

## 运行面

tooling / 构建产物字面量守卫（`tests/repo/structure/built-path-literals.spec.ts`）。

## 复现

```sh
cp docs/testing.md /tmp/docs-testing.bak
printf '\npackages/company-pack/lib/types/lib/ghost.js（mutation probe）\n' >> docs/testing.md
pnpm test tests/repo/structure/built-path-literals.spec.ts   # 期望红，实际 2 passed
cp /tmp/docs-testing.bak docs/testing.md
```

实跑日志 = `runtime/tmp/c11/mut-built-doc.log`（spec exit 0）；还原后 `git diff` 为空。

## 根因与证据

- **根因**：BUG-185 的修复把扫描面写成 checks、tools、probes 的 `.mjs`（当时 replay 的载体），没有覆盖同类的 `.md` / `.ts` 文档；文档中的旧 built 路径不会在运行时炸，但会误导维护者。
- **确认**：注入 → spec 绿；还原 → 绿。
- **同类**：`tests/**/*.ts`、`docs/**/*.md`、`README`、`.agents/skills/**` 都不在面内。

## 失败类与同类排查

**失败类 = 文档指针**（守卫的载体后缀/目录集合不完备）。

同类：BUG-194（`.js` 源码）、BUG-196（导航文档）、BUG-198（false red on `.js` source）是同一「按后缀/目录白名单」模式。

## 修复方案与范围

- 扫描面扩到所有 live 文本（`.md`、`.ts`、`.tsx`、`.mjs`、`.js`、`.sh`），排除 frozen/归档；负例 = `docs/testing.md` 注入 ghost 字面量 → 红。
- 或：把 `lib/types` 字面量收成「只允许 checks/tools/probes 的 `.mjs`」并写明理由——但文档里的旧路径仍会误导，推荐扩面。
- 明确不改：不修改构建布局、不重录产物。

## 已修判定

向 `docs/testing.md` 注入 packages/company-pack/lib/types/lib/ghost.js → `pnpm test tests/repo/structure/built-path-literals.spec.ts` 红；还原 → 4 passed。`node checks/lanes/replay.e2e.mjs` 仍 ALL PASS。

## 修复证据

- 改动面：`tests/repo/structure/built-path-literals.spec.ts`
- 红：`pnpm test tests/repo/structure/built-path-literals.spec.ts`（扫描面不含 docs/.ts：面覆盖用例红）
- 绿：`pnpm test tests/repo/structure/built-path-literals.spec.ts`（4 passed；live 文本面）
- 提交：commit 34f84fd2
