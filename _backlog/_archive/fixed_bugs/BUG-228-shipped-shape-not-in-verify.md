---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-228：真实 tarball 的 shipped-shape 检查不在 verify / pre-push；源码泄漏只到 release 才红

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 指纹闭包 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C14 低置信卡](../../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-6 / G2）。
> **留痕**：批次 Note [2026-11-18-shipped-shape-closure-and-low-confidence-runtime](../../../notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md)（本批共用）。

## 症状

C13 修复新增了 `tests/repo/release/shipped-shape.spec.ts`（合成 fixture）和 `pnpm release:shape`（真实 tarball），但：

- `pnpm verify` 只跑 spec 的合成用例，不跑 `release:shape`；
- `.githooks/pre-push` 不调用 `release:shape`；
- `SURFACE_RULES` 把 `packages/company-pack/README.shipped.md` 归到 `coveredBy: ['verify']`，而 verify 不含真实 tarball 检查；
- `release --prepare` 才做「解包 → sanitize → 重打 → check」。

因此：改了 `README.shipped.md`、`presets/**` 的注释或 `cordis.patch.yml` 的 dev 指针，**verify/pre-push 可以全绿**，直到发布时才红。真实 tarball 检查被「release 期」垄断。

## 复现

```sh
node --input-type=module -e "import { selectSurfaces } from './tools/lib/core/asset-lanes.mjs'; console.log(selectSurfaces(['packages/company-pack/README.shipped.md']))"
grep -n 'release:shape\|shipped-shape' .githooks/pre-push package.json
```

实测：`README.shipped.md` 命中 `coveredBy: ['verify']`；pre-push 无 `release:shape`；只有 `package.json` 的手动脚本。另一条静态证据：`release:shape` 需要 `_dist` 在场，fresh clone/CI 无 `_dist`，所以它天然不能进无条件的 verify/pre-push（见 Note 的 `[environment-gap]`）。

## 根因与证据

- 根因：shipped-shape 的判据依赖 `_dist`（构建产物），而 verify/pre-push 不保证 `_dist` 在场；于是只能把真实检查放到 release。`coveredBy: verify` 是**声明性**兜底，不执行真实 tarball 检查（与 C12 BUG-206 同族）。
- 证据：`selectSurfaces` 输出；pre-push 原文；[shipped-shape.spec.ts](../../../tests/repo/release/shipped-shape.spec.ts) 只测合成 fixture；Note `[environment-gap]`。
- 影响：dev 文本泄漏可在 merge 前全绿；发布前才红，修复成本/回滚面更大。

## 失败类与同类排查

**失败类 = 验证面 / coveredBy 空证据**（真实检查不在无条件步骤）。

同类：BUG-227（stale `_dist`）；C12 的 BUG-206（coveredBy 不执行）；BUG-223/226（checker 面缺口）。

## 已修判定

修成什么算修好：

1. 新增 `checkSourceShape`（不依赖 `_dist`）：README.shipped 链接/pnpm 文案、cordis/presets/content dev 限定、`dsh.bundle.patch` 目标在源码树存在。
2. 该检查进 `checks/gates/shipped-links.mjs`，随 `pnpm verify`/pre-push 的 `run-gates` 真跑（不新增昂贵阶段）；`README.shipped` 的 coveredBy = `verify`。
3. 最小负例：README.shipped 加未限定 dev 路径或 patch 缺目标 → spec 红；改回 → 绿。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`、`tests/repo/release/shipped-shape.spec.ts`、`tools/lib/core/asset-lanes.mjs`
- 红：`pnpm verify`（旧检查不覆盖源码侧；真树植入未限定 dev 路径仍 PASS）
- 绿：`pnpm verify`（`shipped-links` gate PASS；真树植入未限定 dev 路径 → gate 红，还原 → 绿）
- 提交：commit 87d8b15d
- 补正（2026-11-18）：源码侧检查从 coverage:ratchet 移到 `checks/gates/shipped-links.mjs`（verify/run-gates），避免给 BUG-212 的昂贵阶段加负担。
- 补正提交：commit 153fe423（source shape 并入 shipped-links、README.shipped coveredBy=verify）
