---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-173：legacy json-ledger 的 JSON 块在 HTML 注释里仍被解析

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 90](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-162 修了 headings 的注释容器，JSON-ledger 提取器没有共用同一形状层。
> **留痕**：Note [2026-11-14-shape-state-machine-and-gate-edges.md](../../../notes/implemented/2026-11-14-shape-state-machine-and-gate-edges.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8c-more-shape.mts`。

## 症状

旧 `json-ledger` PRD 把整个 JSON 账本放进 HTML 注释（准备废弃/保留历史）：

```html
<!--
```json
{ "prd": { ... } }
```
-->
```

`validateProductDocs` 仍从注释里提取 JSON，返回 `ok: true`、`reqCount: 1`。注释里的账本实际仍在生效；作者以为注释掉了。

## 根因（假设）

`extractJsonBlock()` 用正则 `/```json\s*\n([\s\S]*?)\n```/` 直接在**原始文本**上找第一个 json 块；`markdown-shape.ts` 的 `scanDocument()` 只服务标题/表格扫描，没有覆盖 JSON 提取。围栏/注释形状层与 JSON 提取器是两套。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8c-more-shape.mts
```

看 `legacy commented JSON true [] 1`；把注释去掉/换成非 json 块后计数变化。

## 影响 / 失败类

**失败类 6（持久化/迁移）**：legacy PRD 的注释本意是「停用」，但 `/prd check` 仍以它为定义面；`/req check` 的 `jsonLedgerDefinitions` 也走 `extractJsonBlock`，同样会看到幽灵定义。旧动议只读兼容期间，注释不是安全的停用方式。

## 修复方向（不在本卡实施）

- `extractJsonBlock()` 消费 `scanDocument()` 的结构行，只在 `structural` 行上找围栏/json 块；注释内不算；
- 或提取后与 `scanDocument()` 的行号对齐，跳过注释行；
- spec 覆盖「注释里的 json 块不提取」「围栏里的 json 块正常」。

## 已修判定

```text
HTML 注释里的 json 围栏块不被提取：legacy PRD 的注释账本不再生效（`validateProductDocs` 报缺定义/计数 0）
围栏外（非注释）的 json 块正常提取（不回归）
红证：extractJsonBlock 回到原文匹配 → 注释 JSON 生效复现
```

判据由 `tests/lib/prd-check.spec.ts` 的注释 JSON 用例搭载；红证 = 去掉注释掩码。

## 修复证据

- 改动面：`packages/company-pack/src/lib/prd-check.ts`、`packages/company-pack/src/lib/markdown-shape.ts`、`tests/lib/prd-check.spec.ts`
- 红：去掉 `maskHtmlComments` → `npx vitest run tests/lib/prd-check.spec.ts` 红（注释 JSON 生效）
- 绿：接回注释掩码 → `npx vitest run tests/lib/prd-check.spec.ts` 绿（33 passed）
- 提交：commit d6aa860d

## 证据

- `runtime/tmp/c8c-more-shape.mts` / `.log`：注释 JSON → `true [] 1`。
- 代码：[prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts) 的 `extractJsonBlock()`；[requirements-check.ts](../../../packages/company-pack/src/lib/requirements-check.ts) 的 `jsonLedgerDefinitions()`。
