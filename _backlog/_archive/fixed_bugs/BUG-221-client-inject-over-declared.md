---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-221：dsh.client.inject 声明 9 条依赖边，client factory 实际只 require 1 条

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— B1 类型闭包 + S1–S4 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C13 运行时/发布面分离卡](../settled_issues/2026-11-17-runtime-shipped-boundary-exploratory.md)（C13-9 / C）。
> **留痕**：批次 Note [2026-11-17-shipped-package-boundary](../../../notes/implemented/2026-11-17-shipped-package-boundary.md)（本批共用）。

## 症状

[package.json](../../../packages/company-pack/package.json)：

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

但 构建产物 `lib/client.js` 的 factory 实际只 `require`：

```text
@deepseek-ai/dsh-client-ui-primitives
react
react/jsx-runtime
```

9 条 inject 里 **8 条没有被 factory require**（它们在 bundle 里内联），而必需的 primitives 不在 inject。README 还写「`dsh.client.inject` 的依赖边 = 本包 client 模块 factory 的依赖边」（[README](../../../packages/company-pack/README.md) 约第 140 行），与实盘相反。

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

修成什么算修好：

1. `dsh.client.inject` = factory 实际 require 的 package row（primitives）+ **组合/排序边**；后者必须每条都有 `peerDependencies` 背书。实测删除 8 条内联边会让 `tests/client/company-client-composition.spec.ts` 红：`web boot: 1 entry did not activate … waiting for services: slots, remote, sessions, locale`——它们不是幽灵，是激活顺序边。
2. `pnpm release:shape` 从 `lib/client.js` 的 require 派生：`required_not_declared == []`；`declared_not_required` 的每条必须在 peerDependencies 里（否则红）。
3. README 不再声称 inject = factory 全部依赖边：写清「package row 到达 + 插件组合/排序」两种语义（react 由 platform baseline 提供）。

## 修复证据

- 改动面：`packages/company-pack/package.json`、`packages/company-pack/README.shipped.md`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（旧 tarball：client: inject 9 条中 8 条未被 factory require（且缺 primitives））
- 绿：`pnpm release:shape`（新 tarball：inject = 9 条有 peer 背书的组合边 + primitives；checker 允许 peer-backed 边、拒绝无 peer 幽灵边；company-client-composition 绿）
- 提交：commit f1629047
