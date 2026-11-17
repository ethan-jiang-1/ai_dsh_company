---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-217：client bundle require dsh-client-ui-primitives，但 peer 与 dsh.client.inject 都没声明

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-3 / C13-9 / C·E）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`package/lib/client.js`（浏览器半的 bundle）在 factory 初始化时 `require`：

```text
@deepseek-ai/dsh-client-ui-primitives
react
react/jsx-runtime
```

但 [package.json](../../packages/company-pack/package.json)：

- `peerDependencies` 里**没有** `@deepseek-ai/dsh-client-ui-primitives`；
- `overrides`/`dependencies` 也没有；它只在 `devDependencies` 里；
- `dsh.client.inject` 的 9 条里**没有**它。

因此「本包声明它依赖的模块」与「bundle 实际 require 的模块」不一致；当前 `client-load` 绿是因为宿主基线恰好提供了 primitives，不是包契约自足。

## 复现

用「只提供 `client.inject` + react」的假 module table 加载 client bundle：

```sh
node --input-type=module - <<'EOF'
import { readFileSync } from 'node:fs'
const root = 'runtime/tmp/c13-dist/package'
const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
const provided = new Set([...pkg.dsh.client.inject, 'react', 'react/jsx-runtime'])
const required = new Set(); const missing = new Set()
globalThis.window = { addEventListener(){}, removeEventListener(){}, __ModuleLoader__: { load({ factory }) {
  const req = (name) => { required.add(name); if (!provided.has(name)) { missing.add(name); throw new Error(`not declared: ${name}`) } return {} }
  try { factory(req) } catch (e) { console.log('factory_error=', e.message) }
} } }
await import(`./${root}/lib/client.js`)
console.log('required=', [...required].sort())
console.log('missing=', [...missing].sort())
EOF
```

实测：`factory_error=not declared: @deepseek-ai/dsh-client-ui-primitives`；
`required=['@deepseek-ai/dsh-client-ui-primitives','react','react/jsx-runtime']`；
`missing=['@deepseek-ai/dsh-client-ui-primitives']`。

## 根因与证据

- 根因：[tsdown.config.ts](../../packages/company-pack/tsdown.config.ts) 的 client 半 `external` 用了 `/^@deepseek-ai\/dsh-client-/`，把 primitives external 成 `require`；但 `package.json` 的 `peerDependencies` 与 `dsh.client.inject` 是手写清单，没有同步（它只在 devDependencies）。
- 证据：上脚本；[lib/client.js](../../packages/company-pack/lib/client.js) 的 require；`package.json` 三处清单。
- 影响：安装到不 hoist primitives、或宿主基线未注册该模块的 profile，client 加载会 `module not found`；`client-load` 只证明当前 dev 宿主有它。

## 失败类与同类排查

**失败类 = 配置组合 / client 装配**（依赖声明与 bundle require 不一致）。

同类：react 也未在 peer/inject（[BUG-222](BUG-222-client-react-not-declared.md)）；`client.inject` 8 条声明未被 factory require（[BUG-221](BUG-221-client-inject-over-declared.md)）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. `@deepseek-ai/dsh-client-ui-primitives` 进 `peerDependencies` 和 `dsh.client.inject`（或 tsdown 不 external、把它内联）。
2. 最小判据：只提供 `client.inject` + react 的假 module table 加载 `lib/client.js`，`missing == []`。
3. 正例：真 `client-load` 仍绿；`preset.entry` 不受影响。
