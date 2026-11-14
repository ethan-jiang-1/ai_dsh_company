---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-152：CRLF/BOM 的 headings PRD 被判「没有定义小节」

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 86](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8-H1）；`/prd check` 与 present 闸门共用 `validateProductDocs`。
> **留痕**：Note [2026-11-14-eight-bug-second-sources.md](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8-round1.mts`、`runtime/tmp/c8-structural.mts`。

## 症状

一份字段完整、结构合法的 headings PRD，以 CRLF（Windows 换行）保存后，`validateProductDocs(mrd, prd)` 返回：

```text
PRD 没有 `### REQ-###` 定义小节（没有需求 = 没定义产品）
slice S1 列出不存在的 REQ：REQ-001
```

`/prd check` 因此红；`present` 前的 `prd-gate` 对 `numbering: identity` 的动议 deny。文件开头带 UTF-8 BOM 时同样被判「缺 definition 头」。

## 根因（假设）

- `prdRequirementBlocks()` 用 `text.split('\n')` 切行；`PRD_SECTION_HEADING = /^###\s+(REQ-\d{3})\b\s*(.*)$/` 的 `$` 在无 `m` 标志时只匹配串尾/尾 `\n` 前，不吃行尾 `\r`，所以 `### REQ-001 ...\r` 不命中。
- `parsePrdHeader()` 的 `^---\r?\n` 已兼容 CRLF，但 `parsePrdDocument()` 的入口不剥 BOM；BOM 让 frontmatter 匹配失败。
- 同一文件在 LF 下 `ok: true`（baseline），证明是换行/编码处理而不是内容错误。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8-round1.mts
node --import tsx/esm runtime/tmp/c8-structural.mts
```

`c8-round1.mts` 输出 `baseline true 0 1`，随后 `CRLF PRD false [...]`；`c8-structural.mts` 输出 `BOM PRD false [...]`。

## 影响 / 失败类

**失败类 6（会话/持久化/迁移）的文本形状变体**：合法文档因平台换行/编码被误判为「没有需求」，阻断交付；错误信息把读者指向内容缺失，实际是解析器假设。对模型是假红，对用户是交付卡死。

## 修复方向（不在本卡实施）

- 切行用 `split(/\r?\n/)` 或在入口归一化 CRLF；标题正则允许 `\r?$`。
- 入口剥 UTF-8 BOM；或让 `parsePrdHeader` 允许 `^\uFEFF?---`。
- spec 覆盖 CRLF / BOM / LF 三形状，并断言错误文本不误导。

## 已修判定

```text
LF          validateProductDocs(mrd, prd) === { ok: true, reqCount: 1, acCount: 1 }
CRLF        validateProductDocs(mrd, prd) === { ok: true }   ← 现在 false「没有定义小节」
BOM+CRLF    validateProductDocs(mrd, prd) === { ok: true }   ← 现在 false「缺 definition 头」
错误文本    不含「没有定义小节」「缺 definition 头」（三形状都不再指向内容缺失）
```

判据由 `tests/lib/prd-check.spec.ts` 的 CRLF / BOM 用例搭载（同 diff 落）；红证 = 把归一化拆掉，两类用例立刻回到当前输出。原复现脚本 `runtime/tmp/c8-round1.mts` 的 `CRLF PRD` 行由 `false [...]` 变 `true []`，`runtime/tmp/c8-structural.mts` 的 `BOM PRD` 行同上。

## 证据

- `runtime/tmp/c8-round1.mts`：LF baseline `true 0 1`；CRLF PRD `false` + 两条错误；CRLF MRD 仍 `true`（MRD 的 JSON 块兼容 CRLF）。
- `runtime/tmp/c8-structural.mts`：BOM PRD `false`，错误「缺 definition 头」。
- 代码：[prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts#L358) / [prd-check.ts](../../../packages/company-pack/src/lib/prd-check.ts#L293)。
