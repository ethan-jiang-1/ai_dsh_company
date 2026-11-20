---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-220：两个 bundle 各留 sourceMappingURL，tarball 里 0 个 .map

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../settled_issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-5 / A·E）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

## 症状

`package/lib/index.js` 与 `package/lib/client.js` 末尾各有一行：

```text
//# sourceMappingURL=index.js.map
//# sourceMappingURL=client.js.map
```

但 tarball 的 `.map` 条目为 **0**（`files` 只列 `lib/*.js`，未列 `*.map`）。浏览器 DevTools / `node --enable-source-maps` 会请求对应 map 并 404；安装面留下一个指向包内不存在文件的引用。

## 复现

```sh
T=_dist/dsh-company-pack-0.11.9.tgz
grep -n 'sourceMappingURL' <(tar -xOf "$T" package/lib/index.js) | tail -2
grep -n 'sourceMappingURL' <(tar -xOf "$T" package/lib/client.js) | tail -2
tar -tzf "$T" | grep -c '\.map$'
pnpm release:shape
```

实测两条 sourceMappingURL；`.map` 计数 `0`。

## 根因与证据

- 根因：[tsdown.config.ts](../../../packages/company-pack/tsdown.config.ts) 的 `sourcemap: true`，但 `files` 只收 `lib/index.js`/`lib/client.js`/`lib/*.js`，没有 `.map`；构建与打包的产物清单没有对齐。
- 证据：上命令；bundle 尾部；`files`。
- 影响：调试器/`--enable-source-maps` 的 404；把构建期调试资产引用带进运行时字节。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（构建产物引用与打包清单不一致）。

同类：`lib/types` 过度打包（[BUG-213](BUG-213-tarball-ships-type-dts-majority.md)）；`prepack` 死引用（[BUG-214](BUG-214-shipped-prepack-missing-scripts.md)）。

## 已修判定

修成什么算修好：

1. tsdown `sourcemap: false`；tarball 的 bundle 无 `sourceMappingURL`、无 `.map` 条目。
2. `pnpm release:shape` 对旧 tarball 报 2 条 dangling sourceMappingURL / 0 map，新 tarball 0。
3. 正例：`company-entry`/`client-load` 仍绿。

## 修复证据

- 改动面：`packages/company-pack/tsdown.config.ts`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（旧 tarball：bytes: lib/index.js 与 lib/client.js 各 1 条 sourceMappingURL，tarball .map = 0）
- 绿：`pnpm release:shape`（新 tarball：sourcemap:false + stripComments；tarball 无 sourceMappingURL/.map）
- 提交：commit f1629047
