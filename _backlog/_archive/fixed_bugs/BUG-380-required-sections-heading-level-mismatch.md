---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-380：`hasStructuralSection` 声称支持 `#`–`######`，实现只认 `##`——一条三级标题的必填小节永远判「缺」

> 严重级别：P2（开关与实现不符：BUG-373 的修复把 `/delivery check` 的必填小节改成结构判据，代码用 `/^#{1,6}\s+(.*)$/` 接受任意级标题，再交给 `sectionStructuralText`——而后者只匹配二级标题（`^[ ]{0,3}##\s+…`）。交付规则是**内容**（`content/delivery-modes/<id>/delivery-rules.json`，可随部署/内容包演进）：一旦有人把 needle 写成 `### 3.1 Response`，即使文档里真有这一节，也会永远报「缺 section」并把交付闸门挡死）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（标题层级透传）
>
> **留痕**：Note [2026-11-24-degrade-and-structure-batch](../../../notes/implemented/2026-11-24-degrade-and-structure-batch.md)（批次 377..383：标题层级透传）

## 症状

[`delivery-command.hasStructuralSection`](../../../packages/company-pack/src/host/commands/delivery-command.ts#L68-L71)：

```ts
const heading = /^#{1,6}\s+(.*)$/.exec(wanted)
if (heading !== null) return sectionStructuralText(text, heading[1] ?? '') !== undefined
```

[`sectionStructuralText`](../../../packages/company-pack/src/lib/docs/markdown-shape-core.js) 经 `sectionRange` 定位，而 `sectionRange` 的模式是 `` `^[ ]{0,3}##\\s+${heading}\\s*$` ``——只认二级。

## 运行面

- **面 = host + lib**：[`delivery-command.ts`](../../../packages/company-pack/src/host/commands/delivery-command.ts#L61-L90)、[`markdown-shape-core.js`](../../../packages/company-pack/src/lib/docs/markdown-shape-core.js) 的 `sectionRange`。

## 复现

```sh
pnpm exec tsx -e "
import { sectionStructuralText } from './packages/company-pack/src/lib/docs/markdown-shape.ts';
console.log('## Foo  ->', typeof sectionStructuralText('## Foo\nbody\n', 'Foo'));
console.log('### Foo ->', sectionStructuralText('### Foo\nbody\n', 'Foo'));
console.log('# Foo   ->', sectionStructuralText('# Foo\nbody\n', 'Foo'));
"
```

实测 `## Foo -> string`、`### Foo -> undefined`、`# Foo -> undefined`：同一份文档、同一段正文，只有二级标题能被找到。

## 根因与证据

1. `hasStructuralSection` 接受 1–6 级，交出去的却只有标题文本（丢了层级），下一跳的实现只查 `##`。
2. 现有 `delivery-rules.json` 的 needle 恰好都是 `##` 或表格行前缀，所以当前全绿——这是一条**尚未被内容触发**的假红。
3. 交付文档模板里本来就有三级子节（如 `templates/sow.md` 的 `### In scope` / `### Out of scope`），把子节写进 `requiredSections` 是自然演进。

## 失败类与同类排查

- **失败类**：声明支持一个区间、实现只覆盖子集（`BUG-370` 的「口径分叉」同族，落点是标题层级）。
- **同类排查**：`prd-check` / `requirements-check` 只用 `##` 级小节（`sectionRange` 的设计前提），已核不受影响；`scanDocumentDetailed` 的 `structural` 标志本身与层级无关。

## 修复方案与范围

- **根因修法**：二选一并在注释里写明——① `hasStructuralSection` 只接受 `##`（与 `sectionRange` 契约一致，遇到别的层级给可操作错误「requiredSections 只支持 `##` 级标题」）；或 ② 给 `sectionRange` 加层级参数（`#{1,6}`），`sectionStructuralText` 透传。推荐 ②（模板里已有三级子节）。

## 已修判定

- `hasStructuralSection('<文档含 `### Foo`>', '### Foo')` 为 true（选 ② 时）；选 ① 时同一输入给出「只支持 `##`」的明确错误而不是「缺 section」；
- 现有 `##`/表格行 needle 的既有结论不变；
- 新增 host 用例覆盖 `# `、`### `、`## ` 与表格行四种 needle（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/lib/docs/markdown-shape-core.js`、`packages/company-pack/src/lib/docs/markdown-shape.ts`、`packages/company-pack/src/host/commands/delivery-command.ts`、`tests/host/commands/delivery-command.spec.ts`、`tests/lib/docs/markdown-shape.property.spec.ts`
- 红：`pnpm test tests/host/commands/delivery-command.spec.ts tests/lib/docs/markdown-shape.property.spec.ts` —— 还原层级透传前 1 failed（`### Deep` 永远缺）
- 绿：`pnpm test tests/host/commands/delivery-command.spec.ts tests/lib/docs/markdown-shape.property.spec.ts` —— 全绿（一/二/三级与表格行都按结构命中）
- 提交：commit 6dd7676c
