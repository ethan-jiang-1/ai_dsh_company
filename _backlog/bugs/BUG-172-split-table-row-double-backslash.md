---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-172：splitTableRow 把 `\\|` 当转义竖线，合法单元格不切分

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 90](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-165 修了单反斜杠 `\|`，双反斜杠是另一条 Markdown 转义规则。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8c-more-shape.mts`。

## 症状

Slices 表单元格里出现「字面反斜杠 + 单元格分隔符」：

```text
| S1 | C:\\ | REQ-001 | ok |
```

Markdown 语义：`\\` 是字面反斜杠，后面的 `|` 是单元格分隔符。`splitTableRow()` 却把 `\\|` 当成 `\|`（转义竖线）吞进单元格：

```text
splitTableRow('| S1 | A \\\\| B | REQ-001 | ok |')
→ [ 'S1', 'A \\| B', 'REQ-001', 'ok' ]
```

单元格数少一个，`requirements` 取到 `B`/错列，`/prd check` 报非法 REQ / 未列出 REQ。

## 根因（假设）

`splitTableRow()` 的循环：

```js
if (char === '\\' && body[index + 1] === '|') { cell += '|'; index += 1; continue }
```

只检查「下一个字符是 `|`」，没有先处理 `\\` 转义。遇到 `\\|` 时，第一个反斜杠看第二个反斜杠（不是 `|`）被保留，第二个反斜杠看 `|` 被当成转义，竖线不切分。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8c-more-shape.mts
```

看 `row double [ 'S1', 'A \\| B', 'REQ-001', 'ok' ]`（A 单元格里吞了 `\|`，未切出 `B`）。

## 影响 / 失败类

**失败类 1/6（表格解析）**：Windows 路径、正则/命令片段、数学表达式都可能以字面反斜杠结尾；合法表格被切错列，`/prd check` 红。单转义已修，双转义是同一解析器的下一条规则。

## 修复方向（不在本卡实施）

- 先处理 `\\` → 字面反斜杠（并跳过两个字符），再处理 `\|` → 字面竖线；或按 CommonMark 转义表一次扫描；
- spec 覆盖 `\|`、`\\|`、`\\\|` 与行尾反斜杠。

## 已修判定

```text
`splitTableRow` 先吃双反斜杠（字面反斜杠）再判单转义竖线：单元格保留字面反斜杠，竖线照常分列
单转义竖线行为不变；行尾反斜杠不吞分隔符
红证：按旧顺序（先转义竖线）→ 少一列复现
```

判据由 `tests/lib/prd-check.spec.ts` 的双反斜杠用例搭载；红证 = 还原旧分支顺序。

## 证据

- `runtime/tmp/c8c-more-shape.mts` / `.log`：`row double` 少切一列。
- 代码：[markdown-shape.ts](../../packages/company-pack/src/lib/markdown-shape.ts) 的 `splitTableRow()`。
