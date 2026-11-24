---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-373：`/delivery check` 用裸子串 `includes` 判「必填小节」，把交付文档里**围栏/注释中的**模板样例当成真小节

> 严重级别：P2（闸门可绕过：交付规则里的 `requiredSections` 是形如 `## 2. Scope` 的标题串，检查器只做 `text.includes(needle)`。模型写的 `drafts/sow.md` 里只要**粘贴过模板片段**（放进代码围栏）或把标题写进 `<!-- -->` 注释，就会被判「小节齐了」；而同一批文档走 `/prd check` 时用的是结构感知扫描（围栏/注释里的假标题不算，BUG-160/162 的判据）——同一份文档两个消费者两种结论）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（围栏/注释红，真标题绿）
>
> **留痕**：Note [2026-11-24-meta-single-source-and-presence-parity](../../../notes/implemented/2026-11-24-meta-single-source-and-presence-parity.md)（批次 370..376：结构行判据）

## 症状

[`delivery-command.ts`](../../../packages/company-pack/src/host/commands/delivery-command.ts#L168-L176)：

```ts
for (const needle of rules.requiredSections?.[key] ?? []) {
  sections += 1
  if (!text.includes(needle)) errors.push(tr(`${key} 缺 section「${needle}」`, ...))
}
```

`text` 是文件原文。围栏块、HTML 注释、甚至 frontmatter 里的同名字符串都能满足它。

## 运行面

- **面 = host**：[`delivery-command.ts`](../../../packages/company-pack/src/host/commands/delivery-command.ts#L160-L185)；对照判据 [`markdown-shape.sectionStructuralText`](../../../packages/company-pack/src/lib/docs/markdown-shape.ts) 被 `/prd check` / `/req check` 使用。

## 复现

```sh
pnpm exec tsx -e "
import content from './packages/company-pack/content/delivery-modes/project-services/delivery-rules.json' with { type: 'json' };
const needles = Object.values(content.requiredSections).flat();
const fenced = needles.map(n => '\\`\\`\\`\\n' + n + '\\n\\`\\`\\`').join('\\n');
const commented = needles.map(n => '<!-- ' + n + ' -->').join('\\n');
for (const [name, text] of [['fenced', fenced], ['commented', commented]]) {
  const missing = needles.filter(n => !text.includes(n));
  console.log(name, 'missing =', missing.length, '=> /delivery check 判', missing.length === 0 ? 'PASS' : 'FAIL');
}
"
```

实测 `fenced missing = 0 => PASS`、`commented missing = 0 => PASS`：两份文档**一个真小节都没有**，却都能过 `/delivery check`。

## 根因与证据

1. 判据是子串而不是结构：没有复用 `scanDocument`/`sectionStructuralText`（本仓已有唯一实现，且 `/prd check` 明确「围栏/注释里的表不算定义」）。
2. 规则里的 `requiredSections` 值本身就是 markdown 标题（`## 2. Scope`、`| # | Milestone |`），语义上要求「作为一个结构行出现」，不是「文本里出现过这串字」。

## 失败类与同类排查

- **失败类**：同一份文档的两种结构敏感度（`BUG-160/162` 的第三次落点，这次在 `/delivery`）。
- **同类排查**：`requiredFields`（同一规则文件）目前没有任何检查器消费——但 content 文档也没声明 `/delivery check` 会校验它（`document-map.md` 只写 `documents.file` 与 `requiredSections`），故不单独立卡。

## 修复方案与范围

- **根因修法**：`requiredSections` 的判定改为结构行匹配：对 `##` 开头的 needle 用 `sectionStructuralText`/`scanDocument` 结构化判断；表格类 needle 用结构化行 + `splitTableRow` 判断。并给旧动议留出「文档不含围栏」的等价路径（不改变正常文档的结论）。

## 已修判定

- 上述两份只有围栏/注释样例的文档分别被判 `缺 section`（红）；
- 正常文档（真标题）仍通过；
- 新增 host 用例覆盖围栏与注释两种绕过（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/host/commands/delivery-command.ts`、`tests/host/commands/delivery-command.spec.ts`
- 红：`pnpm test tests/host/commands/delivery-command.spec.ts` —— 还原裸 `includes` 前 2 failed（围栏/注释样例通过）
- 绿：`pnpm test tests/host/commands/delivery-command.spec.ts` —— 29/29 passed（样例不算、真标题通过）
- 提交：commit df7bfda8
