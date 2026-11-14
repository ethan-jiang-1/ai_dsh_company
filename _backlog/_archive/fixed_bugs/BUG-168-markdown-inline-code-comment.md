---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-168：共享扫描器把行内代码里的 `<!--` 当注释开始，后续需求整段被吞

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 90](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；`markdown-shape.ts` 是 BUG-160/162 修复后的共享结构行判据。
> **留痕**：Note [2026-11-14-shape-state-machine-and-gate-edges.md](../../../notes/implemented/2026-11-14-shape-state-machine-and-gate-edges.md)（同轮八卡）；复现脚本 = `runtime/tmp/c8c-markdown-shape.mts`。

## 症状

PRD 的字段值里出现行内代码形式的注释开头：

```text
- userStory: 支持 `<!--` 注释
```

`validateProductDocs` 把该行后面的内容当成 HTML 注释，后续定义字段全部不可见，报：

```text
REQ-001.source 不能为空
REQ-001.slice 缺失
REQ-001.type ... 缺失
```

同一文档把行内代码改成 `` `<!-- -->` ``（成对）即 `ok: true`。

## 根因（假设）

`scanDocument()` 在**整行文本**上找 `<!--` / `-->`，没有识别行内代码 span（反引号）或链接文本；`<!--` 一旦出现就进入 `inComment`，直到 `-->` 才恢复。行内代码里的注释记号本应是字面文本。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8c-markdown-shape.mts
```

看 `inline <!-- only false [...]`；`inline <!-- --> true []`。

## 影响 / 失败类

**失败类 6/9（文档文本形状）**：PRD 只要在 userStory/描述里引用 HTML 注释语法（邮件模板、HTML 渲染类产品很常见），后面的需求字段就被吞，`/prd check` 红、present 闸门 deny；错误信息指向字段缺失，实际是扫描器把代码当注释。

## 修复方向（不在本卡实施）

- `scanDocument()` 增加行内代码 span 状态（成对反引号，支持多反引号围栏），代码 span 里的 `<!--` / `-->` 不参与注释状态；
- 或先按 CommonMark 解析行内结构再扫块级；
- spec 覆盖「行内 `<!--` 不成注释」「行内 `-->` 不闭合」「成对注释正常」。

## 已修判定

```text
行内代码里的注释开头/结尾记号不参与注释状态：字段值引用注释语法时，后续字段仍解析，ok true
成对行内代码与普通 HTML 注释仍被移除（不回归）
红证：去掉 code span 状态 → 行内注释开头吞掉后文、6 条字段缺失复现
```

判据由 `tests/lib/prd-check.spec.ts` 的行内代码注释用例搭载；红证 = 去掉 `codeSpanAt` 分支 → 字段缺失复现。

## 修复证据

- 改动面：`packages/company-pack/src/lib/markdown-shape.ts`、`tests/lib/prd-check.spec.ts`
- 红：去掉 `codeSpanEnd` 分支 → `npx vitest run tests/lib/prd-check.spec.ts` 红（行内注释开头吞后文，6 条字段缺失）
- 绿：接回 code span 状态 → `npx vitest run tests/lib/prd-check.spec.ts` 绿（33 passed）
- 提交：commit d6aa860d

## 证据

- `runtime/tmp/c8c-markdown-shape.mts` / `.log`：行内 `<!--` → 6 条字段错误；成对 → `true []`。
- 代码：[markdown-shape.ts](../../../packages/company-pack/src/lib/markdown-shape.ts) 的 `scanDocument()`。
