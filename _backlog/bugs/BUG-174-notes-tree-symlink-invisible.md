---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-174：notes-tree 对 symlink 条目视而不见，链接 Note 绕过整道门

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 90](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；notes-tree 是 2026-11-14 新增的树形/状态门。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9c-gate-edges.mts`。

## 症状

在 `notes/implemented/` 放一个 symlink（指向任意文件，含公司盘外）：

- `notesTreeProblems()` 返回 `problems: []`、`files: 0`；
- `notesStatusProblems()` 返回 `problems: []`、`checked: 0`；
- `pnpm verify` 的 `notes-tree` 因此放行。

`readdirSync({ withFileTypes: true })` 对 symlink 的 `isFile()` / `isDirectory()` 都是 false；两处循环都只处理 file/dir，symlink 被静默跳过。

## 根因（假设）

`notesTreeProblems()` 与 `notesStatusProblems()` 都没有 `isSymbolicLink()` 分支；symlink 既不算文件也不算目录，直接落到 `continue`。门禁的「树形闭集」不覆盖链接形状。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9c-gate-edges.mts
```

看 `notes symlink { problems: [], files: 0 } { problems: [], checked: 0 }`；被链接的 Note 内容/状态行完全没被检查。

## 影响 / 失败类

**失败类 12（文档/生成物指针）**：Notes 是决策记忆；一个 symlink Note 可以指向公司盘外/未审内容而不进形状与状态门，读者在 `notes/implemented/` 看到它却得不到门禁保证。与 BUG-163/167 同属新门禁的覆盖缺口。

## 修复方向（不在本卡实施）

- 两处循环显式处理 `entry.isSymbolicLink()`：直接红（Notes 只许普通文件/目录），或按真实路径解析后再判但记录链接形状；
- 补红证：`notes/implemented/<date>-link.md` symlink → `notes-tree` 红；还原 → 绿。

## 已修判定

```text
`notes/implemented/` 下的文件 symlink → notes-tree 红（符号链接不是许可形状）
目录 symlink 同样红；普通文件/目录不误判
红证：去掉 symlink 分支 → problems [] / files 0 复现
```

判据由 `tests/checks/notes-tree.test.mjs` 的 symlink 形状搭载；红证 = 移除 symlink 判定。

## 证据

- `runtime/tmp/c9c-gate-edges.mts` / `.log`：symlink 目录条目被跳过，`files: 0`、`checked: 0`。
- 代码：[notes-tree.mjs](../../checks/gates/notes-tree.mjs) 的 `notesTreeProblems()` / `notesStatusProblems()`。
