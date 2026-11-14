---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-169：未闭合 HTML 注释静默吞掉后文，/prd check 报「没有需求」

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 90](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；与 BUG-162 的注释容器同层。
> **留痕**：Note [2026-11-14-shape-state-machine-and-gate-edges.md](../../../notes/implemented/2026-11-14-shape-state-machine-and-gate-edges.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8c-markdown-shape.mts`。

## 症状

PRD 里有一个未闭合的 HTML 注释：

```html
<!-- 未闭合注释

## Requirements (definition point)
### REQ-001 ...
```

`validateProductDocs` 报：

```text
PRD 没有 `### REQ-###` 定义小节（没有需求 = 没定义产品）
slice S1 列出不存在的 REQ：REQ-001
```

后文整段被当注释内容，解析器没有提示「注释未闭合」。

## 根因（假设）

`scanDocument()` 在 `inComment === true` 时，如果当前行找不到 `-->`，就把 `index = raw.length` 结束该行并**继续保持 `inComment` 到 EOF**；没有 EOF 检查，也没有把「注释未闭合」记成结构错误。调用方只看到「没有 REQ」这个级联结果。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8c-markdown-shape.mts
```

看 `unclosed comment false [...]` 两条错误。

## 影响 / 失败类

**失败类 6/9（文档文本形状）**：一个漏写 `-->` 的编辑错误会让整份 PRD 被读成空文档，错误信息指向「没有需求」，而不是「注释未闭合」；模型/操作员会去补需求而不是修注释。

## 修复方向（不在本卡实施）

- `scanDocument()` 返回 `unclosedComment` 标记/行号；`validateProductDocs` / `checkRequirements` 先报「HTML 注释未闭合」；
- 或未闭合注释按「结构错误」fail loud，不静默吞到 EOF；
- spec 覆盖未闭合注释、注释内 fence、注释后正文。

## 已修判定

```text
未闭合 HTML 注释 → `/prd check` 报「HTML 注释未闭合（第 N 行起）」，不再报「没有需求」
`/req check` 对同一文档报同一条根因错误（不级联成缺层）
闭合注释后正文照常解析（不回归）
```

判据由 `tests/lib/prd-check.spec.ts` 与 `tests/lib/requirements-check.spec.ts` 的未闭合注释用例搭载；红证 = 去掉 EOF 检测 → 「没有需求」级联复现。

## 修复证据

- 改动面：`packages/company-pack/src/lib/prd-check.ts`、`packages/company-pack/src/lib/requirements-check.ts`、`tests/lib/prd-check.spec.ts`
- 红：去掉 EOF 未闭合检测 → `npx vitest run tests/lib/prd-check.spec.ts` 红（两条「注释未闭合」用例）
- 绿：接回 `scanDocumentDetailed` 的未闭合行号 → `npx vitest run tests/lib/prd-check.spec.ts` 绿（33 passed）
- 提交：commit d6aa860d

## 证据

- `runtime/tmp/c8c-markdown-shape.mts` / `.log`：`unclosed comment false [...]`。
- 代码：[markdown-shape.ts](../../../packages/company-pack/src/lib/markdown-shape.ts) 的 `scanDocument()`。
