---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-181：scanDocument 只按行找 code span 闭合，跨行行内代码被当结构

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 91](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-168 修了行内代码里的 `<!--`，但只覆盖单行。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8d-multiline-span.mts`。

## 症状

CommonMark 的行内代码 span 可以跨行：

````markdown
- userStory: `start
### REQ-999 示例
`
````

`validateProductDocs` 把第二行的 `### REQ-999` 当**真实需求定义**，`reqCount` 从 1 变 2；同时 REQ-001 的后续字段（acceptance/source/slice/...）被截断，报 10+ 条缺失。

## 根因（假设）

`codeSpanEnd(line, index)` 只在**当前行** `line.indexOf('`'.repeat(run), ...)` 找闭合；跨行 span 在第一行找不到闭合就返回 undefined，扫描器把 `<!--`/标题当普通结构。CommonMark 的 code span 可以包含换行，闭合可以在后续行。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8d-multiline-span.mts
```

输出 `false 2`，错误含 `REQ-999.userStory 缺失` 与 REQ-001 字段缺失。

## 影响 / 失败类

**失败类 6/9（文档文本形状）**：PRD 用跨行行内代码承载命令/示例（长 userStory、代码片段）时，示例里的 `### REQ` 会变幽灵需求，真实 REQ 字段被截断；`/prd check` 红、present 闸门 deny。

## 修复方向（不在本卡实施）

- `scanDocument()` 的 code span 状态跨行维护（打开后保持到闭合，或 EOF 报未闭合 code span）；
- 或者要求行内代码不跨行并在 spec 里显式（但 CommonMark 允许，文档工具可能生成）；
- spec 覆盖跨行 code span、跨行未闭合 backtick、代码块（围栏）不受影响。

## 已修判定

```text
跨行行内代码：`- userStory: `start` 换行 `### REQ-999` 换行 `` ` `` 里的标题不算定义，REQ-001 字段不被截断，ok true
跨行未闭合 backtick 按字面处理（不吞全文）；围栏内的反引号不受影响
红证：去掉跨行 span 状态 → reqCount 2 与字段截断复现
```

判据由 `tests/lib/prd-check.spec.ts` 的跨行 code span 用例搭载；红证 = 去掉跨行状态。

## 证据

- `runtime/tmp/c8d-multiline-span.mts` / `.log`：`false 2`，幽灵 `REQ-999`。
- 代码：[markdown-shape.ts](../../packages/company-pack/src/lib/markdown-shape.ts) 的 `codeSpanEnd()` / `scanDocumentDetailed()`。
