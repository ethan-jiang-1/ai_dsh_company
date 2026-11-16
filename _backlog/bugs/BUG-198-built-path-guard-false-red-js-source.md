---
status: 修复就绪
severity: P2
opened: 2026-11-16
---

# BUG-198：构建产物字面量守卫把合法的 `.js` 源码判红（sourceCandidates 只认 .ts/.tsx）

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：修复就绪
>
> **关联**：[探索卡 Round 93](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-185 的守卫（`tests/repo/structure/built-path-literals.spec.ts`）。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-guard-surfaces-not-samples.md`）。

## 症状

`built-path-literals.spec.ts` 的 `sourceCandidates()` 只生成 `src/<path>.ts` / `.tsx`。包里有 `src/lib/docs/markdown-shape-core.js`（运行时零依赖扫描器，`tsc` 原样产出 `lib/types/lib/docs/markdown-shape-core.js`）。一条**合法**的字面量：

```text
packages/company-pack/lib/types/lib/docs/markdown-shape-core.js
```

会被判「没有现行源码对应」——spec 1 failed。也就是说：守卫既漏 `.js` 源码，又会对正确的 `.js` 产物字面量假红。

## 运行面

tooling / 构建产物字面量守卫；不是运行时行为。

## 复现

```sh
cp checks/lanes/replay.e2e.mjs /tmp/replay.bak
printf '\n// valid .js source artifact probe: packages/company-pack/lib/types/lib/docs/markdown-shape-core.js\n' >> checks/lanes/replay.e2e.mjs
pnpm test tests/repo/structure/built-path-literals.spec.ts   # 期望绿（源码/产物都在），实际 1 failed
cp /tmp/replay.bak checks/lanes/replay.e2e.mjs
```

实跑日志 = `runtime/tmp/c11/mut-built-js-source.log`（spec 1 failed / 1 passed）。还原后 `git diff` 为空。

## 根因与证据

- **根因**：`sourceCandidates(literal)` 写死 `src/${rest}.ts` / `.tsx`；包的源码面还包含 `.js`（`markdown-shape-core.js`），但守卫没有枚举它。
- **确认**：`ls packages/company-pack/lib/types/lib/docs/markdown-shape-core.js` 存在；`src/lib/docs/markdown-shape-core.js` 存在；spec 仍判无源码。
- **影响**：将来任何车道 import `markdown-shape-core` 的构建产物都会被迫改错或豁免；守卫从“防陈旧”变成“禁合法”。

## 失败类与同类排查

**失败类 = 导出形态**（构建产物字面量的源码对应表不完整）。

同类：`built-path-literals` 的 `.mjs` 扫描面（BUG-197）；`live-pointer-paths` 的 `.js` 漏扫（BUG-194）；三处应共用「源码后缀封闭集 + 产物存在」原语。

## 修复方案与范围

- `sourceCandidates` 加 `.js`（必要时 `.mjs`），并把源码后缀集合与 `tsconfig` 的 allowJs / include 对齐；负例 = 合法 `.js` 字面量 → 绿，幽灵字面量 → 红。
- 同时扩扫描面（BUG-197）时保持这条绿。
- 明确不改：不改 `markdown-shape-core.js` 的源码/产物关系。

## 已修判定

向 `checks/lanes/replay.e2e.mjs` 临时加入 `packages/company-pack/lib/types/lib/docs/markdown-shape-core.js` → `pnpm test tests/repo/structure/built-path-literals.spec.ts` 绿；把路径改成不存在的 `ghost.js` → 红；还原 → 绿。
