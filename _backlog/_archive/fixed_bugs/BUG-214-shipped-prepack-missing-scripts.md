---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-214：发布包 `package.json` 的 `prepack` 指向不存在的 scripts/prepack-check.mjs

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-2 / B）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

## 症状

tarball 里的 `package/package.json` 保留：

```json
"scripts": { "prepack": "node scripts/prepack-check.mjs" }
```

但 `files` 不含 `scripts/**`，tarball 的 `package/scripts/` entry 为 **0**。在解包目录跑 `npm pack --dry-run` 直接失败：

```text
npm error command sh -c node scripts/prepack-check.mjs
npm error code 1
```

发布包因此不能自己重打包/审计打包；`prepack` 是仓库 dev 检查，却作为运行时 manifest 的活脚本留在安装面。

## 复现

```sh
rm -rf runtime/tmp/c13-dist && mkdir -p runtime/tmp/c13-dist
tar -xzf _dist/dsh-company-pack-0.11.9.tgz -C runtime/tmp/c13-dist
tar -tzf _dist/dsh-company-pack-0.11.9.tgz | grep -c '^package/scripts/'
cd runtime/tmp/c13-dist/package && npm pack --dry-run
```

实测：`package/scripts/` 0 条；`npm pack --dry-run` `exit=1`，日志末行即上文的 `node scripts/prepack-check.mjs` 失败。

## 根因与证据

- 根因：[package.json](../../../packages/company-pack/package.json) 的 `prepack` 是仓库构建期检查（[prepack-check.mjs](../../../packages/company-pack/scripts/prepack-check.mjs)），但 `files` 只列运行时字节；npm 在 `npm pack` 时仍会执行 tarball 里的 `prepack`，于是死引用。
- 证据：上命令；`files` 数组；`prepack-check.mjs` 的路径。
- 影响：任何从安装包再打包/审计的流程都会在第一步失败；也把 dev 脚本名带进了运行时 manifest。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（dev lifecycle 脚本泄漏到 tarball）。

同类：`devDependencies` 的 `workspace:*` 让解包 `npm install` 同样失败（[BUG-219](BUG-219-shipped-devdeps-workspace-protocol.md)）；`README` 的 dev 链接（[BUG-215](BUG-215-shipped-readme-dev-links.md)）。

## 已修判定

修成什么算修好：

1. tarball 的 `package.json` 不再带 `scripts`（尤其 `prepack`）；源码 `package.json` 的 prepack 保留，仓库打包前仍跑。
2. 解包目录 `npm pack --dry-run --ignore-scripts` 成功；`pnpm release:shape` 对旧 tarball 报 `scripts.prepack`，新 tarball 无。
3. 正例：`pnpm release --prepare` 仍执行 prepack 检查。

## 修复证据

- 改动面：`packages/company-pack/package.json`、`tools/lib/release/shipped-shape.mjs`、`tools/release/export-dist.mjs`
- 红：`pnpm release:shape`（旧 tarball：manifest: 仍带 scripts（prepack 指 scripts/prepack-check.mjs））
- 绿：`pnpm release:shape`（新 tarball：tarball package.json 无 scripts；解包 `npm pack --dry-run --ignore-scripts` 成功）
- 提交：commit f1629047
