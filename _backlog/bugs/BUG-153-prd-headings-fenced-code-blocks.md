---
status: 调查中
severity: P2
opened: 2026-11-13
---

# BUG-153：headings PRD 不识别围栏代码块，示例标题被当需求定义

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 86](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8-H2）；`/prd check` 与 present 闸门共用 `validateProductDocs`。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8-round1.mts`。

## 症状

PRD 中出现围栏代码块（示例、schema 片段、引用）时，代码块里的标题会被当作真实结构：

- 围栏里的 `### REQ-999 示例` → 被解析成第 2 条需求，报 `REQ-999.userStory 缺失` 等 6 条；
- 围栏里的 `## Slices` + 一行表格 → 顶掉真实 Slices 表，报 `REQ-001.slice 指向不存在的 slice：S1`、`slice S9 列出不存在的 REQ：REQ-999`。

同一文档去掉围栏块后 `ok: true`，证明是解析器把示例当定义。

## 根因（假设）

`parsePrdSlices()` 与 `prdRequirementBlocks()` 直接在全文行数组上匹配 `^## Slices`、`^### REQ-\d{3}` 和表格行；没有维护 Markdown 围栏状态（``` / ~~~），也不区分「示例」与「定义」。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8-round1.mts
```

看 `fenced REQ false [...]` 与 `fenced Slices false [...]`。

## 影响 / 失败类

**失败类 9（client UI/文档）与 6（持久化文本）交界**：合法 PRD 只要带一段示例代码就可能被 `/prd check` 判红，present 闸门 deny；若示例里恰好是完整字段，还会变成幽灵需求进入计数。对模型是假红，对交付是卡死。

## 修复方向（不在本卡实施）

- 扫描标题/表格前维护 fence 状态（至少 ``` 与 ~~~，含语言标记），只在非 fence 区域解析。
- spec 覆盖「围栏里 REQ/Slices 不被解析」与「围栏外正常解析」两组。

## 证据

- `runtime/tmp/c8-round1.mts`：`fenced REQ false [...]`、`fenced Slices false [...]`；baseline `true 0 1`。
- 代码：[prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts#L358) / [prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts#L293)。
