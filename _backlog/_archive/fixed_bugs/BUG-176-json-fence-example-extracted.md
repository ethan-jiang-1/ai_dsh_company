---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-176：legacy JSON 提取仍会命中围栏示例，示例账本盖过真实账本

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 91](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-173 修了「注释里的 JSON」，围栏仍未进入 `extractJsonBlock` 的掩码。
> **留痕**：Note [2026-11-14-shape-fences-and-gate-parsing.md](../../../notes/implemented/2026-11-14-shape-fences-and-gate-parsing.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8d-json-fence.mts`。

## 症状

MRD/legacy PRD 先放一个示例围栏，再放真实 JSON 账本：

````markdown
```markdown
```json
{"mrd":{"opportunities":[]}}
```
```

```json
{"mrd":{"opportunities":[{"id":"MR-001", ...}]}}
```
````

`extractJsonBlock()` 返回**示例**里的空 opportunities（`value.mrd.opportunities = []`），真实账本被忽略。若示例 JSON 不合法，则直接报「json 需求块不可解析」，即便真实块是好的。

## 根因（假设）

`extractJsonBlock()` 现在用 `maskHtmlComments(text)` 屏蔽注释，但正则 `/```json\s*\n([\s\S]*?)\n```/` 仍在**整篇文本**上找第一个 json 块；`maskHtmlComments` 保留围栏内容（这是有意的，注释里的围栏是字面），所以围栏示例里的 ```json 会先命中。共享 `scanDocument()` 已有 `structural` 标记，但 JSON 提取器没有用它。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8d-json-fence.mts
```

输出 `ok: true`，`value.mrd.opportunities` 是示例的空数组；真实账本在第二个块。

## 影响 / 失败类

**失败类 6（持久化/迁移）**：示例/模板块是文档常见内容；JSON 提取器把示例当权威账本，`/prd check` 与 `/req check` 读到错误的需求集，可能假绿（空账本）或假红（示例块坏）。与 BUG-173 同族，但容器是围栏不是注释。

## 修复方向（不在本卡实施）

- `extractJsonBlock()` 消费 `scanDocument()`：只在 `structural === false` 的**围栏块**内找 JSON，且跳过示例围栏（例如只认顶层围栏，不认嵌套）；
- 或先剥掉所有围栏示例，再取第一个顶层 ```json；
- spec 覆盖「示例围栏 + 真账本」「只有示例」「围栏内坏 JSON」。

## 已修判定

```text
示例围栏（markdown 块里嵌 json 块）不再被当账本：extractJsonBlock 取第一个顶层 json 围栏块
示例在前、真账本在后 → 返回真账本；只有示例时明确报缺块/解析错误，不静默取示例
红证：还原整篇正则 → 返回示例的空 opportunities 复现
```

判据由 `tests/lib/prd-check.spec.ts` 的围栏示例用例搭载；红证 = 去掉围栏块提取。

## 修复证据

- 改动面：`packages/company-pack/src/lib/prd-check.ts`、`packages/company-pack/src/lib/markdown-shape.ts`、`tests/lib/prd-check.spec.ts`
- 红：还原整篇 json 正则 → `npx vitest run tests/lib/prd-check.spec.ts` 红（示例围栏被当账本）
- 绿：改读顶层围栏块 → `npx vitest run tests/lib/prd-check.spec.ts` 绿（35 passed）
- 提交：commit 8a95fc51

## 证据

- `runtime/tmp/c8d-json-fence.mts` / `.log`：返回示例的空 opportunities。
- 代码：[prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts) 的 `extractJsonBlock()`；[markdown-shape.ts](../../../packages/company-pack/src/lib/markdown-shape.ts) 的 `maskHtmlComments()`。
