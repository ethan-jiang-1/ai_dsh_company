---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-165：Slices 表不认 Markdown 转义竖线，合法单元格被拆成两列

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 89](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；Slices 表是 PRD 的 slice→REQ 归属面。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8b-more-shapes.mts`。

## 症状

Slices 表的 Goal/Exit 单元格里写合法 Markdown 转义竖线：

```text
| S1 | A \| B | REQ-001 | ok |
```

`validateProductDocs` 报：

```text
slice S1 含非法 REQ id：B
slice S1 的 requirements 未列出 REQ-001
slice S1 列出不存在的 REQ：B
```

即 `splitRow()` 按所有 `|` 切分，没有把 `\|` 当普通字符，Goal 被拆成两列，`requirements` 取到了错误单元格。

## 根因（假设）

`splitRow()` 先去掉首尾 `|`，再 `split('|')`；没有处理 Markdown 表格的 `\|` 转义（也没有处理代码 span 里的 `|`）。模板/技能没有禁止单元格里出现竖线。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8b-more-shapes.mts
```

看 `escaped pipe false [...]` 三条错误；把 `\|` 去掉后同表 `ok`。

## 影响 / 失败类

**失败类 1/6（表格解析）**：合法 PRD 只要 Goal/Exit 里有竖线（`A | B`、管道图、命令）就被判红，present 闸门 deny；错误信息指向 REQ id，实际是单元格切分错误。

## 修复方向（不在本卡实施）

- `splitRow()` 按未转义 `|` 切分：扫描字符，遇到 `\|` 保留为 `|`，遇到反斜杠转义下一个字符；或先保护 `\|` 再 split；
- spec 覆盖 Goal / requirements / Exit 三列里的 `\|`。

## 已修判定

```text
Goal / Requirements / Exit 三列里的 `\|` 都按字面竖线解析，不拆列
`| S1 | A \| B | REQ-001 | ok |` → ok，slice S1 的 goal = `A | B`
未转义竖线仍是列分隔（不回归）
```

判据由 `tests/lib/prd-check.spec.ts` 的转义竖线用例搭载；红证 = 还原 `split('|')` → 三条错误（非法 REQ id B / 未列出 REQ-001 / 列出不存在的 REQ B）复现。

## 证据

- `runtime/tmp/c8b-more-shapes.mts` / `.log`：`escaped pipe false [...]`。
- 代码：[prd-check.ts](../../packages/company-pack/src/lib/prd-check.ts) 的 `splitRow()`。
