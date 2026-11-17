---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-220：两个 bundle 各留 sourceMappingURL，tarball 里 0 个 .map

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-5 / A·E）。
> **留痕**：待修复者决定（只开卡，不修）。

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
```

实测两条 sourceMappingURL；`.map` 计数 `0`。

## 根因与证据

- 根因：[tsdown.config.ts](../../packages/company-pack/tsdown.config.ts) 的 `sourcemap: true`，但 `files` 只收 `lib/index.js`/`lib/client.js`/`lib/*.js`，没有 `.map`；构建与打包的产物清单没有对齐。
- 证据：上命令；bundle 尾部；`files`。
- 影响：调试器/`--enable-source-maps` 的 404；把构建期调试资产引用带进运行时字节。

## 失败类与同类排查

**失败类 = 导出形态 / 发布面**（构建产物引用与打包清单不一致）。

同类：`lib/types` 过度打包（[BUG-213](BUG-213-tarball-ships-type-dts-majority.md)）；`prepack` 死引用（[BUG-214](BUG-214-shipped-prepack-missing-scripts.md)）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 二选一：`files` 收 `lib/*.js.map`，或 tsdown `sourcemap: false`（清掉 bundle 尾部注释）；不要保留半套引用。
2. 最小判据：tarball 内 `sourceMappingURL` 的每个目标都存在；或 bundle 无 `sourceMappingURL`。
3. 正例：`company-entry`/`client-load` 仍绿。
