---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-178：fix-evidence 的节标题在代码块里也会命中，截到错误节

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 91](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；4a142a8b 把节标题改成行首锚定，但没有排除代码块。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9d-section-codeblock.mts`。

## 症状

卡面在「模板/示例」代码块里引用节标题，再写真实节：

````markdown
```md
## 修复证据
```

## 修复证据

- 改动面：`packages/company-pack/src/lib/prd-check.ts`
- 红：`pnpm test`
- 绿：`pnpm test`
- 提交：commit <sha>
````

`fix-evidence` 的 `section()` 用 `/^## 修复证据\s*$/m` 命中**代码块里的第一行**，从那里取到真实标题之前，四行全缺，报：

```text
缺 `- 改动面：`；缺 `- 红：`；缺 `- 绿：`；缺 `- 提交：`
```

## 根因（假设）

`section()` 只做行首正则，不区分 Markdown 围栏/代码块；代码块里的 `## 修复证据` 也是行首，被当真实标题。`fix-evidence` 没有复用 `markdown-shape.ts` 的结构视图。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9d-section-codeblock.mts
```

看 gate 报四条缺失；删除示例代码块后同卡 PASS。

## 影响 / 失败类

**失败类 12（门禁判据）**：卡面引用模板/示例是正常的写作形态；门禁截到示例节，合法修复被判证据缺失。与 BUG-169 的「容器不是结构」同族，但发生在门禁读卡而不是 PRD 解析。

## 修复方向（不在本卡实施）

- `section()` 用 `scanDocument()`/围栏状态，只在 `structural` 行匹配 `## 修复证据`；
- 或要求节标题唯一，重复直接红并点名两处；
- spec 覆盖「代码块引用标题 + 真节」「只有代码块」「重复节」。

## 证据

- `runtime/tmp/c9d-section-codeblock.mts` / `.log`：代码块示例导致四行全缺。
- 代码：[fix-evidence.mjs](../../checks/gates/fix-evidence.mjs) 的 `section()`。
