---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-222：client bundle external 了 react / react/jsx-runtime，但 package.json 没有 react peer 或 inject

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../settled_issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-3 / C13-9 / C·E）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

## 症状

`package/lib/client.js` 的 factory 需要：

```text
react
react/jsx-runtime
@deepseek-ai/dsh-client-ui-primitives
```

[package.json](../../../packages/company-pack/package.json) 的 `peerDependencies`/`dsh.client.inject` **都没有** `react` 或 `react/jsx-runtime`；`react` 只在 `devDependencies`。当前 `client-load` 绿是因为 DSH 宿主基线模块表提供了 react；包契约本身没有声明它。

## 复现

```sh
node --input-type=module - <<'EOF'
import { readFileSync } from 'node:fs'
const root = 'runtime/tmp/c13-dist/package'
const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
console.log('peer react?', Boolean(pkg.peerDependencies?.react))
console.log('inject react?', pkg.dsh.client.inject.includes('react'))
const text = readFileSync(`${root}/lib/client.js`, 'utf8')
for (const id of ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives']) {
  console.log(id, 'required?', text.includes(`require("${id}")`))
}
EOF
```

实测 `peer react? false`、`inject react? false`、三条 `required? true`。

## 根因与证据

- 根因：[tsdown.config.ts](../../../packages/company-pack/tsdown.config.ts) 的 client 半 `external` 明确列了 `react`/`react/jsx-runtime`（模块表回答），但 package 的 peer/inject 是手写清单，没有同步；react 是 devDependency，不是 peer。
- 证据：上命令；`lib/client.js`；`package.json`。
- 影响：任何不提供 react 基线的 module table / 非 Web 组合加载 client 时会失败；声明面不能自证。

## 失败类与同类排查

**失败类 = 配置组合 / client 装配**（external 与实际声明不一致）。

同类：primitives 缺失（[BUG-217](BUG-217-client-inject-missing-primitives.md)）；inject 过报（[BUG-221](BUG-221-client-inject-over-declared.md)）。

## 已修判定

修成什么算修好：

1. 明确 react/react-jsx-runtime 由 vendor `PLATFORM_MODULES` 基线提供，写进 shipped README/构建注释；不把 react 误加为包 row。
2. `pnpm release:shape` 读 vendor `platform.ts` 的 `PLATFORM_MODULES`，断言 bundle 的 react require 在基线内；旧 tarball 无此追溯红。
3. 假 module table 只提供 inject + platform baseline 时 `missing == []`；真 `client-load` 仍绿。

## 修复证据

- 改动面：`packages/company-pack/README.shipped.md`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（旧 tarball：假 module table 只给 client.inject+react 时缺 primitives；package.json `peer react? false`）
- 绿：`pnpm release:shape`（新 tarball：react/react-jsx-runtime 在 vendor PLATFORM_MODULES；checker 读 platform.ts 断言；README 写明 baseline）
- 提交：commit f1629047
