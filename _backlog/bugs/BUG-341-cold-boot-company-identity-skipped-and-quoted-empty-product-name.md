---
status: 调查中
severity: P1
opened: 2026-11-23
---

# BUG-341：冷启动 `loadIdentity` 永不加载 `company.md`，且 `parseCompanyIdentity` 把出厂 `productName: ''` 解析为字面量 `''`

> 严重级别：P1（重要：两个缺陷互相掩护——冷启动 `sessions.list` 尚在 `pending` 导致 `loadIdentity` 直接退出、永不重试；一旦真实读到出厂 `company.md`，`parseCompanyIdentity` 未解引号又会把侧栏品牌 `DreamTeamBrandName` 渲染成字面量 `''`）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；触及 `client` 启动身份接线与 YAML 解析语义）

## 症状

1. **冷启动永不加载公司身份**：浏览器启动执行 `apply()` 时，[`registerSidebarIdentity`](../../packages/company-pack/src/client/index.ts#L337-L348) 只调用一次 `void loadIdentity()`。此时上游 `sessions.list` 处于 `phase: 'pending'`、`byId: {}`，第 341 行 `if (first === undefined) return` 静默退出，且未订阅 `sessions.list`（对比同文件第 112 行 `errorRelay` 显式 `list.subscribe(...)`），导致后续会话到达后 [`companyIdentity()`](../../packages/company-pack/src/client/data/company-identity.ts#L27-L29) 仍永远停在 `FALLBACK_IDENTITY`。
2. **出厂 `company.md` 让侧栏品牌显示成两个单引号 `''`**：当 `loadIdentity()` 真正读到出厂 [`content/state/company.md`](../../packages/company-pack/content/state/company.md)（第 3 行 `productName: ''`）时，[`parseCompanyIdentity`](../../packages/company-pack/src/client/data/company-identity.ts#L52-L69) 直接做 `fields[k] = value.trim()` 而未解 YAML 引号，于是 `productName` 被解析成 2 个单引号字符 `"''"`；随后 [`DreamTeamBrandName`](../../packages/company-pack/src/client/ui/Brand.tsx#L14-L17) 执行 `{identity.productName || t('brand.name')}` 时因 `"''"` 为 truthy，侧栏品牌直接渲染出 `''` 而非「梦之队」/ `Dream Team`。

## 运行面

- **面 = client**：[`packages/company-pack/src/client/index.ts`](../../packages/company-pack/src/client/index.ts#L335-L348)、[`packages/company-pack/src/client/data/company-identity.ts`](../../packages/company-pack/src/client/data/company-identity.ts#L52-L69)、[`packages/company-pack/src/client/ui/Brand.tsx`](../../packages/company-pack/src/client/ui/Brand.tsx#L14-L17)；上游证据 [`sessions/service.ts`](../../vendor/dsh/packages/api/session-controller/src/client/sessions/service.ts#L262)。

## 复现

```sh
pnpm exec tsx -e "
import { parseCompanyIdentity } from './packages/company-pack/src/client/data/company-identity.ts';
const parsed = parseCompanyIdentity('---\ncompany: Dream Team (sample)\nproductName: \'\'\n---\n');
console.log({ productName: parsed?.productName, brand: parsed?.productName || '梦之队' });
"
```

实测输出 `{ productName: "''", brand: "''" }`；若用 `sessions.list` 初始 `{ ids: [], byId: {}, phase: 'pending' }` 驱动 `apply()` 后再推送会话，实测 `workspaceFiles.read` 调用次数为 `0`，`companyIdentity().company` 保持 `""`。

## 根因与证据

1. `vendor/dsh` 的 `sessions.list` 初始快照为 `{ ids: [], byId: {}, phase: 'pending', projectionsBySession: {} }`（[`service.ts:262`](../../vendor/dsh/packages/api/session-controller/src/client/sessions/service.ts#L262)），`apply()` 同步期 `byId` 为空是正常冷启动时序。`client/index.ts:338-348` 未像同文件 `errorRelay`（第 112 行）那样订阅 `sessions.list` 等待非空/可用 root 会话，也未优先选 `mainView`/company 会话而是取 `Object.values(byId)[0]`。
2. `company-identity.ts:58-68` 手写 `frontmatter` 解析未复用 [`yamlScalar`](../../packages/company-pack/src/lib/docs/yaml-scalar.ts)（host 侧 [`bootstrap.ts:108`](../../packages/company-pack/src/host/run-bundle/bootstrap.ts#L108) / `req-command.ts:70` 均用它解引号与占位符），把 YAML 空串 `''` / `""` 原样当成内容字符。

## 失败类与同类排查

- **失败类**：异步 store 冷启动时序漏订阅 + 自研 YAML 标量解析与共享 helper 脱节。
- **同类排查**：`client/index.ts` 内 `errorRelay`（第 112 行）与 `registerTitle`（第 286 行）均正确订阅了 `sessions.list`；仅 `registerSidebarIdentity` 里的 `loadIdentity` 漏订。另外 `company-identity.ts:23-24` 仍使用模块级可变全局变量 `current`/`listeners`（多实例隔离隐患）。

## 修复方案与范围

- **根因修法**：
  1. 在 `registerSidebarIdentity` 订阅 `sessions.list`（挂载 `scoped.effect`），当存在可用会话（优先 `retainedBy.mainView > 0` 或非 `subagent` 根会话）时触发读取并在成功/确认后退订或按会话 workspace 切换重读；
  2. `parseCompanyIdentity` 复用 `yamlScalar` 解单/双引号并过滤 `<...>` 模板占位符，同时保持 `productName: ''` 退回 `''` 让 `DreamTeamBrandName` 正常落到 `t('brand.name')`；
  3. 同步排查将 `companyIdentity` 改为实例态而非模块级单例（若纳入本次收口）。

## 已修判定

- `sessions.list` 从 `pending` 空快照启动并在后续到达会话时，`workspaceFiles.read` 自动触发且 `companyIdentity()` 更新为盘上 `company.md` 值；
- 读取出厂 `content/state/company.md`（`productName: ''`）时 `parsed.productName === ''`，`DreamTeamBrandName` 渲染 `t('brand.name')` 而非 `''`。
