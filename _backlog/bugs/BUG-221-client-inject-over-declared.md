---
status: 调查中
severity: P2
opened: 2026-11-17
---

# BUG-221：dsh.client.inject 声明 9 条依赖边，client factory 实际只 require 1 条

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：调查中｜审查：—
>
> **关联**：[C13 运行时/发布面分离卡](../issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-9 / C）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

[package.json](../../packages/company-pack/package.json)：

```json
"dsh": { "client": { "inject": [
  "@deepseek-ai/dsh-client-locale",
  "@deepseek-ai/dsh-api-remotes",
  "@deepseek-ai/dsh-api-session-controller",
  "@deepseek-ai/dsh-client-ui-conversation",
  "@deepseek-ai/dsh-client-ui-renderer",
  "@deepseek-ai/dsh-client-ui-sidebar",
  "@deepseek-ai/dsh-client-ui-sidebar-right",
  "@deepseek-ai/dsh-client-ui-tool",
  "@deepseek-ai/dsh-client-ui-workspace"
] } }
```

但 [lib/client.js](../../packages/company-pack/lib/client.js) 的 factory 实际只 `require`：

```text
@deepseek-ai/dsh-client-ui-primitives
react
react/jsx-runtime
```

9 条 inject 里 **8 条没有被 factory require**（它们在 bundle 里内联），而必需的 primitives 不在 inject。README 还写「`dsh.client.inject` 的依赖边 = 本包 client 模块 factory 的依赖边」（[README](../../packages/company-pack/README.md) 约第 140 行），与实盘相反。

## 复现

```sh
node --input-type=module - <<'EOF'
import { readFileSync } from 'node:fs'
const root = 'runtime/tmp/c13-dist/package'
const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
const provided = new Set([...pkg.dsh.client.inject, 'react', 'react/jsx-runtime'])
const required = new Set()
globalThis.window = { addEventListener(){}, removeEventListener(){}, __ModuleLoader__: { load({ factory }) {
  const req = (name) => { required.add(name); if (!provided.has(name)) throw new Error(name); return {} }
  try { factory(req) } catch {}
} } }
await import(`./${root}/lib/client.js`)
const declared = pkg.dsh.client.inject
console.log('declared_not_required=', declared.filter(x => !required.has(x)))
console.log('required_not_declared=', [...required].filter(x => !declared.includes(x)))
EOF
```

实测 `declared_not_required` 为 9 条中除 primitives 外的 8 条；`required_not_declared` 为 primitives。

## 根因与证据

- 根因：`dsh.client.inject` 是手写清单（README 明确称它等于 factory 依赖边），但 tsdown 只 external 了 primitives/react，其余都内联；清单没有从 bundle 的实际 require 派生。
- 证据：上脚本；`lib/client.js` 的 `require`；`package.json` 的 inject；README 第 140 行。
- 影响：注入面大于实际面 → 宿主被迫加载/排序 8 个未使用模块；同时漏掉 1 个实际依赖（[BUG-217](BUG-217-client-inject-missing-primitives.md)）。声明不可作为「client 需要什么」的 oracle。

## 失败类与同类排查

**失败类 = 配置组合 / client 装配**（声明与 factory 实际边不一致）。

同类：primitives 缺失（216）；react 未声明（[BUG-222](BUG-222-client-react-not-declared.md)）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 从 `lib/client.js` 的实际 `require` 派生 `dsh.client.inject`（加 primitives/react，删 8 条内联边）；或按需要保留 8 条但把 README 的「= factory 依赖边」改掉并写清用途。
2. 最小判据：`required_not_declared == []`，且 `declared_not_required == []`（或每条有在 README 说明的理由）。
3. 正例：真 `client-load` 仍绿。
