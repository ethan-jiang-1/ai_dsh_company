---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-163：notes-tree 状态行检查跳过 rejected/，负知识 Note 不受状态门约束

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 89](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；notes-tree 是 2026-11-14 新增门禁，声称「状态行唯一且与目录同轴」。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9b-notes-tree.mts`。

## 症状

在 `notes/rejected/` 放一篇文件名日期为 2026-11-14、没有 `状态：` 行的新 Note：

- `notesTreeProblems()` 返回 `problems: []`；
- `notesStatusProblems()` 只检查 `proposed` / `implemented` / `archived`，`rejected/` 整个 lifecycle 被跳过，`checked` 不包含它；
- `pnpm verify` 的 `notes-tree` 因此放行。

同一临时树里 `notes/proposed/` 的缺状态 Note 会被报错（`状态行必须恰好 1 行`），说明是 lifecycle 覆盖缺口，不是形状规则本身。

## 根因（假设）

`notesStatusProblems()` 的循环写死 `['proposed', 'implemented', 'archived']`；`LIFECYCLES` 含 `rejected`，状态行规则注释也说「全文件恰好 1 行」，但拒绝目录没有进入检查。[notes/README](../../notes/README.md) §一 明确 `rejected/` 的状态行读作 `rejected`。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9b-notes-tree.mts
```

输出 `status.checked: 2`，且只有 `proposed` 的缺状态被报；`rejected` 文件不在检查内。

## 影响 / 失败类

**失败类 12（文档/生成物指针）**：`rejected/` 是负知识层；状态行缺失/不一致时门禁全绿，读者无法一眼判断该 Note 是否仍有效。新门禁声称覆盖全 lifecycle，实际留了一个口。

## 修复方向（不在本卡实施）

- 把 `rejected` 加入状态行检查；状态词匹配 `rejected`（或按目录定义的同轴词）；
- 补一条红证：`notes/rejected/` 缺状态行 → `notes-tree` 红；还原 → 绿。

## 证据

- `runtime/tmp/c9b-notes-tree.mts` / `.log`：`rejected` 无状态行，`tree.problems: []`、`status.checked: 2`。
- 代码：[notes-tree.mjs](../../checks/gates/notes-tree.mjs) 的 `notesStatusProblems()` 循环。
