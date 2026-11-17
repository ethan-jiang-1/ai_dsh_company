---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-222：client bundle external 了 react / react/jsx-runtime，但 package.json 没有 react peer 或 inject

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-3 / C13-9 / C·E）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`package/lib/client.js` 的 factory 需要：

```text
react
react/jsx-runtime
@deepseek-ai/dsh-client-ui-primitives
```

[package.json](../../packages/company-pack/package.json) 的 `peerDependencies`/`dsh.client.inject` **都没有** `react` 或 `react/jsx-runtime`；`react` 只在 `devDependencies`。当前 `client-load` 绿是因为 DSH 宿主基线模块表提供了 react；包契约本身没有声明它。

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

- 根因：[tsdown.config.ts](../../packages/company-pack/tsdown.config.ts) 的 client 半 `external` 明确列了 `react`/`react/jsx-runtime`（模块表回答），但 package 的 peer/inject 是手写清单，没有同步；react 是 devDependency，不是 peer。
- 证据：上命令；`lib/client.js`；`package.json`。
- 影响：任何不提供 react 基线的 module table / 非 Web 组合加载 client 时会失败；声明面不能自证。

## 失败类与同类排查

**失败类 = 配置组合 / client 装配**（external 与实际声明不一致）。

同类：primitives 缺失（[BUG-217](BUG-217-client-inject-missing-primitives.md)）；inject 过报（[BUG-221](BUG-221-client-inject-over-declared.md)）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 明确 react 是宿主基线还是 peer：若是 peer，加 `react`/`react-dom`（版本范围与 DSH 一致）；若否，README/注释写明「react 由 module table 基线提供」并从 `external` 契约中可追溯。
2. 最小判据：假 module table 只提供 package 声明 + 基线，加载 `lib/client.js` 不缺 react；或声明里明确含 react。
3. 正例：真 `client-load` 仍绿。
