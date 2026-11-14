---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-167：notes-tree 只匹配日期形状，不校验真实日历日期

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 89](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；notes-tree 声称日期前缀是 Note 地址的一部分。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9b-notes-date.mts`。

## 症状

在 `notes/implemented/` 放一篇文件名日期为 `2026-99-99` 的 Note（月/日超出范围）：

`notesTreeProblems()` 返回 `problems: []`；`notesStatusProblems()` 也通过（`checked: 1`，状态行合法）。`2026-99-99` 不是真实日历日期，但门禁只看 `\d{4}-\d{2}-\d{2}`。

## 根因（假设）

`NOTE_FILE` 与 `noteDate()` 只做形状匹配：

```js
/^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9._-]*\.md$/
```

没有月/日范围或真实日历校验；`notesStatusProblems()` 的 `date < effective` 也只是字符串比较，非法日期可能被当成新写/存量。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9b-notes-date.mts
```

输出 `tree { problems: [], files: 1 }`、`status { problems: [], checked: 1 }`。

## 影响 / 失败类

**失败类 12（文档/生成物指针）**：日期前缀是 Note 的寻址与状态生效判据；不可能日期让排序、生效日、审计时间线出现无法解释的条目，而门禁全绿。与 BUG-163 的 lifecycle 覆盖缺口不同：这里是日期语义缺口。

## 修复方向（不在本卡实施）

- 文件名日期解析后做真实日历往返（`YYYY-MM-DD` → `Date` → 同一串）；非法月/日/闰年直接红；
- 状态生效比较用解析后的日期，不用字符串；
- spec 覆盖 `2026-02-29`（非闰年）、`2026-13-01`、`2026-00-10` 与合法日期。

## 已修判定

```text
文件名日期 2026-13-01 / 2026-00-10 / 2026-02-29（非闰年）→ notes-tree 红
合法闰年 2024-02-29 → 绿；合法日期不回归
状态生效比较用解析后的时间（非法日期不进受查集合）
```

判据由 `tests/checks/notes-tree.test.mjs` 的日历日期用例搭载；红证 = 还原成纯形状正则 → 非法日期用例变绿。

## 证据

- `runtime/tmp/c9b-notes-date.mts` / `.log`：非法日期文件 `tree.problems: []`、`status.checked: 1`。
- 代码：[notes-tree.mjs](../../checks/gates/notes-tree.mjs) 的 `NOTE_FILE` / `noteDate()` / `notesStatusProblems()`。
