---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-199：pre-push 对 unseen 改动面只打印、仍 exit 0，未登记面可静默 push

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（pre-push 非 ASCII 路径被 git C-quote 误判「未分类」；归档 ×1912 与修复提交 ×1924 不符）已修复；建议 S1–S5 处置（尾注标签、审查落盘、passed 数校正、`--paths` 不支持项、docs/testing.md 合同行）
>
> **关联**：[探索卡 Round 93](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-186 的修复面（`checks/pre-push-surfaces.mjs` + `selectSurfaces`）。
> **留痕**：Note [2026-11-16-guard-surfaces-not-samples.md](../../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)（本批共用）。

## 症状

BUG-186 的修复让 `selectSurfaces` 返回 `covered` / `unseen`，pre-push 逐条打印；但 `unseen.length > 0` 时脚本只打印「未分类改动面……新目录要登记 SURFACE_RULES」，随后仍走到 `assets.length === 0` 的 `process.exit(0)`。一个未登记的改动面（如 `packages/company-pack/package.json`）可以 push，pre-push 绿。

## 运行面

tooling / pre-push 选择器（`checks/pre-push-surfaces.mjs`）；不是产品运行时。

## 复现

```sh
node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/package.json
```

当前输出：

```text
pre-push surfaces: 未分类改动面（既没有 surface 规则，也没有 coveredBy 申报）——新目录要登记 SURFACE_RULES：packages/company-pack/package.json
pre-push surfaces: 本次未触发面级检查（规则表 = tools/lib/core/asset-lanes.mjs SURFACE_RULES）
```

`exit=0`。对照：同一脚本对 `packages/company-pack/src/lib/presence/presence.ts` 会 `→ replay`。

## 根因与证据

- **根因**：`unseen` 被设计成「提示」而不是「失败」；`asset-lanes.spec` 的完备性判据又只抽样（BUG-192），于是「规则没登记」与「这个面不需要 lane」在 pre-push 上都表现为绿。
- **确认**：dry-run 实跑 exit 0；`asset-lanes.spec` 的 `unclassified` 只查 21 条样本，19 条真实路径 unseen 仍绿（BUG-192）。
- **为什么不只是 BUG-192**：即使未来把 19 条登记完，任何**新**目录/文件仍会走同一 `unseen → exit 0` 路径；判据需要在运行面失败，而不只在 spec 的固定样本上失败。

## 失败类与同类排查

**失败类 = 配置组合**（选择器对未登记面不阻断）。

同类：`asset-lanes.spec` 的完备性（BUG-192）、`--paths ./` 前缀（BUG-201）；三处是同一 `selectSurfaces` 的边界。

## 修复方案与范围

- `unseen.length > 0` 时打印后 `process.exitCode = 1`（或显式 `FAIL`），并说明「登记 SURFACE_RULES 或写 coveredBy」；`--dry-run` 也保持非零。
- 负例：`--paths packages/company-pack/package.json` → exit 1；登记后 → 0。
- 明确不改：不把 unseen 自动当 covered；不自动跑慢 lane。

## 已修判定

`node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/package.json` 退出非零并点名「登记规则 / coveredBy」；登记后同一命令退出 0。`asset-lanes.spec` 的全 tracked 完备性（BUG-192）同 diff 绿。

## 修复证据

- 改动面：`checks/pre-push-surfaces.mjs`、`tests/checks/pre-push-surfaces.test.mjs`
- 红：`pnpm test:checks`（未登记改动面用例：修复前 exit 0）
- 绿：`pnpm test:checks`（10 PASS；未登记 → exit 1，已登记 → exit 0）
- 提交：commit 34f84fd2
