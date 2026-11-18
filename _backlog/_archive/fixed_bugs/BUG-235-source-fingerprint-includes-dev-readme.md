---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-235：sourceFingerprint 把 dev README.md 算进指纹，改 dev 文档让 _dist 假过期

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1/B2 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C15 卡](../settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-3 / H3）。
> **留痕**：批次 Note [2026-11-18-shipped-key-closure-and-unreadable-inputs](../../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)（本批共用）。

## 症状

`tools/lib/core/pack-source.mjs` 的 `PACKAGE_SOURCE_FILES` 同时包含 `README.md` 与 `README.shipped.md`。但 `README.md` 是**仓库 dev 文档**：`sanitizePackage` 用 `README.shipped.md` 覆盖 tarball 的 README，`README.md` 不随包。改一行 dev README（不改任何 shipped 字节），`sourceFingerprint` 就变，`release:shape` 的新鲜度判据会判 `_dist` 过期，逼一次 `release --prepare`。

实测：在 `packages/company-pack/README.md` 末尾加一行注释：

```text
before 28a0649c63b6
after  267257dd3ac8
```

`_dist/release-manifest.json` 的 sourceFingerprint 仍是 before；`release:shape` 会报 freshness 红。

## 复现

```sh
node --input-type=module -e "import { sourceFingerprint } from './tools/lib/core/pack-source.mjs'; console.log(sourceFingerprint('packages/company-pack').slice(0,12))"
printf '\n<!-- probe -->\n' >> packages/company-pack/README.md
node --input-type=module -e "import { sourceFingerprint } from './tools/lib/core/pack-source.mjs'; console.log(sourceFingerprint('packages/company-pack').slice(0,12))"
git checkout -- packages/company-pack/README.md
```

## 根因与证据

- 根因：`PACKAGE_SOURCE_FILES` 把 dev README 与 shipped README 放在同一指纹集合；`sanitizePackage` 只复制 `README.shipped` 到 tarball 的 `README.md`，源 `README.md` 不参与发布。
- 证据：上命令；[pack-source.mjs](../../../tools/lib/core/pack-source.mjs)；`sanitizePackage` 的 `copyFileSync(shippedReadme, README.md)`。
- 影响：C14 的 freshness 修好了「只改 shipped README 假绿」，但同时把 dev README 变成假红；与 BUG-212（收尾摩擦）叠加。

## 失败类与同类排查

**失败类 = 发布面 / 源码指纹边界**（dev 文件误入 shipped 指纹）。

同类：BUG-212（release 摩擦）；BUG-227/228（上一轮 freshness/接线）。

## 已修判定

修成什么算修好：

1. `PACKAGE_SOURCE_FILES` 移除 dev `README.md`，保留 `README.shipped.md`。
2. 最小判据：只改 dev README → `sourceFingerprint` 不变、`release:shape` PASS；只改 README.shipped → 指纹变、`release:shape` 红。
3. 正例：改 src/presets/content/locale/package.json → 指纹变。

## 修复证据

- 改动面：`tools/lib/core/pack-source.mjs`、`tests/repo/release/shipped-shape.spec.ts`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（dev README.md 在指纹内，改它指纹变）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（dev README 不在 PACKAGE_SOURCE_FILES；改它指纹不变，改 README.shipped 变）
- 提交：commit 56e4f986
