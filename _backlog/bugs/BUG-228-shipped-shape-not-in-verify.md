---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-228：真实 tarball 的 shipped-shape 检查不在 verify / pre-push；源码泄漏只到 release 才红

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-6 / G2）。
> **留痕**：待修复者决定（只开卡，不修）。

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
- 证据：`selectSurfaces` 输出；pre-push 原文；[shipped-shape.spec.ts](../../tests/repo/release/shipped-shape.spec.ts) 只测合成 fixture；Note `[environment-gap]`。
- 影响：dev 文本泄漏可在 merge 前全绿；发布前才红，修复成本/回滚面更大。

## 失败类与同类排查

**失败类 = 验证面 / coveredBy 空证据**（真实检查不在无条件步骤）。

同类：BUG-227（stale `_dist`）；C12 的 BUG-206（coveredBy 不执行）；BUG-223/226（checker 面缺口）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 在 `verify`/pre-push 加一个**不依赖 `_dist`** 的源码侧 shape 检查（README.shipped 链接/pnpm 文案、presets/cordis dev 限定、`dsh.bundle.patch` 目标在 `packages/company-pack` 内存在），真实 tarball 检查仍留 release。
2. 或者把 `release:shape` 放进 CI 的发布 job / weekly（有 `_dist` 的通道），并让 `coveredBy` 指向真实执行它的步骤。
3. 最小负例：README.shipped 加一条未限定 dev 路径 → verify/pre-push 红；正向仍绿。
