---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-310：成品索引的坏条目被静默丢掉——5 条只显示 2 条，面板不说「跳过了什么」

> 严重级别：P2（次要偏重：成品目录是审计视图；索引里一条坏形状的 entry 消失后，统计与列表都不完整，且没有任何提示）｜发现：2026-11-22（E2E 第四轮）｜状态：已修｜审查：agent — 逐条核对已修判定（解析层计数 + 面板原话）
>
> **留痕**：commit 272fd450（解析层 + 面板，材料性；批次 Note 覆盖）。

## 症状

写一份 `kb/deliverables-index.json`，`entries` 里 5 条：

- 1 条合法；
- 1 条 `slug` 为空；
- 1 条 `path` 为空；
- 1 条是 `null`；
- 1 条合法。

面板只显示 2 条，`共 2 份成品`，没有任何「2 条条目坏形状被跳过」的提示。

纯函数证据：

```sh
node --import tsx/esm -e "
import { parseCatalog } from './packages/company-pack/src/client/data/deliverables-index.ts'
const c = parseCatalog(JSON.stringify({ schema:1, generatedAt:'x', counts:{}, entries:[
  {slug:'ok', path:'a'}, {slug:'', path:'b'}, {slug:'c', path:''}, null, {slug:'ok2', path:'d'} ] }))
console.log(c.entries.length, c.entries.map(e => e.slug))
"
# 2 [ 'ok', 'ok2' ]
```

## 运行面

- **面 = client 读模型 + 成品页签**：`packages/company-pack/src/client/data/deliverables-index.ts` 的 `parseCatalog`；`tabs/DeliverablesTab.tsx` 的渲染。
- 数据面 = host 生成的 `kb/deliverables-index.json`。

## 复现

1. 起隔离实例，打开「成品」。
2. 把索引覆盖成上面 5 条（合法 JSON）。
3. 点「重读」。
4. 期望：2 条合法 + 一条「3 条条目坏形状被跳过」；实际：2 条，无提示。

## 根因与证据

`parseCatalog` 对坏 entry 直接 `continue`：

- `deliverables-index.ts:49-56`
  ```ts
  for (const item of value.entries) {
    if (item === null || typeof item !== 'object') continue
    ...
    if (slug === '' || path === '') continue
  ```
  没有计数、没有行号、没有告警；返回的 `DeliverablesCatalog` 只有 entries，没有 skipped。
- 面板只拿 `catalog.entries` 做统计/过滤；`counts` 字段被忽略，所以「共 N」= 幸存条目数。
- 对比：`parseCatalog` 对**整个索引**坏形状返回 null，面板会说「形状不符」；对**单条**坏 entry 却静默（BUG-238/239 同族：可读 ≠ 每条都合法）。

## 失败类与同类排查

**失败类 = 单条坏形状静默丢弃（whole-file 有诊断，row-level 没有）**。同类：

- 台账坏行（BUG-303）已修：row-level 有 `badRows` + 面板提示；成品索引还差这一层。
- 培养记录坏形状有 `brokenRecords` + 提示；成品索引没有。
- 不是整文件损坏：JSON 合法、schema/entries 在场；坏的是 entry 字段。

## 修复方案与范围

- **根因修法**：`parseCatalog` 返回 `{ catalog, skipped: [{ index, reason }] }`（或等价）；面板在统计旁显示「N 条条目坏形状已跳过（索引第 X 条）」。
- 坏形状分类：非对象 / 空 slug / 空 path（可能还有非字符串字段，按需）。
- **判据**：5 条 fixture → 2 条 + skipped=3；合法索引 skipped=0；zh/en 同步。
- **不改**：host 生成索引的格式；`counts` 字段（仍然是派生信息，面板以 entries 为准）。
- **材料性**：client 公开呈现面；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 索引里有坏 entry 时，成品面板明确说「跳过了 N 条」并给索引序号/原因；
- 全部合法时无提示、统计不变；
- 整文件坏形状仍走「形状不符/不可读」而不是 row-level；
- zh/en 两态各一条。

## 修复证据

- 改动面：`packages/company-pack/src/client/data/deliverables-index.ts`（`DeliverablesCatalog.skipped`）、`packages/company-pack/src/client/tabs/DeliverablesTab.tsx`
- 红：`vitest run tests/client/tabs/deliverables-catalog.spec.ts` —— 把 `skipped` 恒置 0（恢复静默丢）后「skipped > 0 ⇒ 出提示」失败（5 条只渲染 2 条、无提示）
- 绿：`vitest run tests/client/tabs/deliverables-catalog.spec.ts` —— 19/19（坏 entry 计数 2 + 面板提示）
- 提交：commit 272fd450
