---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-192：SURFACE_RULES 仍有 19 条 tracked 路径未分类，完备性 spec 只抽样

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（pre-push 非 ASCII 路径被 git C-quote 误判「未分类」；归档 ×1912 与修复提交 ×1924 不符）已修复；建议 S1–S5 处置（尾注标签、审查落盘、passed 数校正、`--paths` 不支持项、docs/testing.md 合同行）
>
> **关联**：[探索卡 Round 93](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 二轮（修复后新面）。
> **留痕**：Note [2026-11-16-guard-surfaces-not-samples.md](../../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)（本批共用）。

## 症状

`tools/lib/core/asset-lanes.mjs` 的 `SURFACE_RULES` 在 BUG-186 修复后仍有 19 条 tracked 路径既没有 surface asset，也没有 `coveredBy` 申报：

```text
.gitattributes
.gitignore
.gitmodules
.jscpd.json
.oxlintrc.json
_dist/安装手册.md
market-index.staged.json
packages/company-pack/LICENSE
packages/company-pack/icon.svg
packages/company-pack/locale/README.md
packages/company-pack/locale/en.json
packages/company-pack/locale/zh.json
packages/company-pack/package.json
packages/company-pack/scripts/prepack-check.mjs
packages/company-pack/tsconfig.client.json
packages/company-pack/tsconfig.host.json
packages/company-pack/tsconfig.json
packages/company-pack/tsdown.config.ts
runtime/harness-home/README.md
```

其中 pack 的 `package.json`（scripts / exports / engines）、`locale/*.json`（用户可见文案）、`scripts/prepack-check.mjs`（发布前检查）是真实的产品/发布面，不是纯文档。改它们时 pre-push 只打印「未分类」，仍 exit 0。

## 运行面

tooling / pre-push 面选择（`tools/lib/core/asset-lanes.mjs` + `checks/pre-push-surfaces.mjs`）；不是运行时行为。

## 复现

```sh
node runtime/tmp/c11/unseen-paths-check.mjs
```

当前 `exit=1`，输出 `tracked=1912 unseen=19` + 上列路径。另一个单点：

```sh
node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/package.json,packages/company-pack/locale/zh.json
```

打印「未分类改动面……」，然后 `exit=0`。

## 根因与证据

- **根因**：`tests/repo/budget/asset-lanes.spec.ts` 的完备性判据用固定 21 条 `SURFACE_SAMPLES` + 根目录/`src/*` 抽样，不是从 `git ls-files` 求全集；pack 子目录与根散件不在样本里，所以 19 条 unseen 不影响绿灯。
- **为什么修复批没抓到**：BUG-186 的判据写的是「每个改动面都有证据」，但实现只证样本；这是「判据名 > 判据面」的同一类假绿。
- **确认**：全 tracked 枚举 + `selectSurfaces` 逐条实跑；两条具体路径的 dry-run 实跑。

## 失败类与同类排查

**失败类 = 配置组合**（面规则注册表不完备，判据抽样）。

同类：`SURFACE_RULES` 9 条规则逐条对盘（globs 均命中真实文件）；`UNCONDITIONAL_STEPS` 7 条与 hook 对齐；缺口只在「全部 tracked 路径」的覆盖面。BUG-199（unseen 不阻断）与 BUG-201（`./` 前缀）是同一选择器的边界。

## 修复方案与范围

- 完备性判据改成 `git ls-files` 全集：每条 tracked 路径必须 `assets` 或 `covered`；`unseen` 非空即红（与 BUG-199 二选一：spec 红或 pre-push 红）。
- 为 19 条路径登记规则：pack `package.json` / `scripts/**` / `tsconfig*` / `tsdown.config.ts` → `coveredBy: ['verify','typecheck']`；`locale/**` → `client-load` 或 `preset`（用户可见文案）；根 `.git*` / `.jscpd.json` / `.oxlintrc.json` / `market-index.staged.json` / `_dist/安装手册.md` / `runtime/harness-home/README.md` → `verify`（或 `dist` 面）。
- 明确不改：不把所有面都塞真入口（成本边界仍按 Note）；只要求「有意不进」有登记。

## 已修判定

`node runtime/tmp/c11/unseen-paths-check.mjs` 退出 0（`unseen=0`）；`node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/package.json,packages/company-pack/locale/zh.json` 打印具体 `coveredBy`，不再打印「未分类」。

## 修复证据

- 改动面：`checks/gates/surface-coverage.mjs`、`checks/run-gates.mjs`、`tools/lib/core/asset-lanes.mjs`、`tests/repo/budget/asset-lanes.spec.ts`
- 红：`node checks/run-gates.mjs`（surface-coverage FAIL：19 条 tracked 路径既无 asset 也无 coveredBy）
- 绿：`node checks/run-gates.mjs`（ALL PASS；surface-coverage ×1924 tracked 路径）
- 提交：commit 34f84fd2
