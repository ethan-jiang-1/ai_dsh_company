---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-382：`/req check` 的退役词与区间计数扫描是裸全文扫描——代码围栏里引用一个退役号就被判红并挡住交付

> 严重级别：P2（假红挡住交付：`checkRequirements` 的退役词与区间计数断言遍历 `normalizeDocument(doc.text).split('\n')` 的**每一行**，不看 `structural`。需求文档里记录「旧编号 `STR-12` 已退役」「覆盖 REQ-001 ~ REQ-004」是正常的迁移说明/样例，写在代码围栏里也会被判违规 ⇒ `/req check` 返回 error，present 闸门随之拒绝交付；而同一函数的其它判据（定义点、表头、小节）全部走 `scanDocumentDetailed` 的结构行）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决）

## 症状

[`requirements-check.ts`](../../packages/company-pack/src/lib/docs/requirements-check.ts#L556-L562)：

```ts
for (const [index, line] of normalizeDocument(doc.text).split('\n').entries()) {
  for (const match of line.matchAll(retired)) errors.push(`${doc.rel}:${index + 1} 退役词 ${match[0]}`)
  for (const match of line.matchAll(RANGE_CLAIM)) errors.push(`${doc.rel}:${index + 1} 区间计数断言 ${match[0]}…`)
}
```

围栏/块注释/行内代码里的同样文本一律计入。

## 运行面

- **面 = lib**：[`requirements-check.ts`](../../packages/company-pack/src/lib/docs/requirements-check.ts#L556-L562)；消费方 `/req check`（[`req-command`](../../packages/company-pack/src/host/commands/req-command.ts)）与 present 闸门（[`prd-gate`](../../packages/company-pack/src/host/commands/prd-gate.ts)）。

## 复现

```sh
pnpm exec tsx -e "
import { checkRequirements } from './packages/company-pack/src/lib/docs/requirements-check.ts';
const mrd = ['---','layer: MRD','definition: json-ledger','---','','\`\`\`json','{\"mrd\":{\"version\":\"0.1\",\"status\":\"draft\",\"opportunities\":[{\"id\":\"MR-001\",\"title\":\"t\",\"segment\":\"s\",\"buyer\":\"b\",\"pain\":\"p\",\"evidence\":[{\"kind\":\"fact\",\"source\":\"x\"}],\"alternatives\":[\"a\"],\"competitors\":[\"c\"],\"value\":\"v\",\"success\":[\"s\"],\"confidence\":\"medium\",\"recommendation\":\"go\"}],\"openQuestions\":[]}}','\`\`\`',''].join('\n');
const prd = ['---','layer: PRD','definition: headings','---','','## Slices','| slice | Goal | Requirements (explicit ids) | Exit condition |','|---|---|---|---|','| S1 | g | REQ-001 | ok |','','### REQ-001 需求','- userStory: a','- acceptance:','  - AC-001-1','    - given: g','    - when: w','    - then: t','- source: [MR-001]','- slice: S1','- type: functional','- priority: P0','- status: draft','- verification: test',''].join('\n');
const run = (extra) => checkRequirements({ meta: { text: 'numbering: identity\nlayers: MRD, PRD' }, docs: [{ rel: 'drafts/mrd.md', text: mrd }, { rel: 'drafts/prd.md', text: prd + extra }] });
console.log('baseline', run('').ok);
console.log('fenced STR-12', JSON.stringify(run('\n\`\`\`\nSTR-12 已退役\n\`\`\`\n').errors));
console.log('inline REQ range', JSON.stringify(run('\n不要把旧编号写成 \`REQ-001 ~ REQ-004\`。\n').errors));
"
```

实测 `baseline true`；`fenced STR-12` → `["drafts/prd.md:29 退役词 STR-12"]`；`inline REQ range` → 区间计数断言报错。两处都在围栏/行内代码里。

## 根因与证据

1. 退役词/区间断言的扫描复用了 `normalizeDocument`（只做平台归一）而不是 `scanDocumentDetailed` 的 `structural` 行，与同函数其它判据的口径不一致（BUG-160/162 的既定纪律：围栏/注释里的内容不算文档结构）。
2. `/delivery check` 的必填小节刚因同一类问题修过（BUG-373），说明这是同一族「结构敏感度」缺陷的下一处。

## 失败类与同类排查

- **失败类**：文本级禁用词扫描缺少结构过滤（BUG-160/162、BUG-373 同族）。
- **同类排查**：`prd-check` 的退役词扫描未见（PRD 侧无此规则）；`requirements-check` 的定义点/表头/小节已用结构行（已核）；`RANGE_CLAIM` 在正文里本来就该禁——问题只在围栏/行内代码里。

## 修复方案与范围

- **根因修法**：两处扫描改用 `scanDocumentDetailed(doc.text).lines.filter(l => l.structural)`（行号仍取原下标）；行内代码是否豁免需裁决——建议「围栏豁免、行内代码豁免」，正文保持禁止。

## 已修判定

- 上述两份文档（围栏内 `STR-12`、行内代码内区间）都不再产生错误，`/req check` 回 success；
- 正文里写 `STR-12` / `REQ-001 ~ REQ-004` 仍判红（负例不退化）；
- 新增 `tests/lib/docs/requirements-check.spec.ts` 用例（旧实现红、新实现绿）。
