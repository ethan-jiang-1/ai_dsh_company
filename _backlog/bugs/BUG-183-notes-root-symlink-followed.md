---
status: 修复就绪
severity: P2
opened: 2026-11-14
---

# BUG-183：notes-tree 只拦子条目 symlink，notes/ 根本身是 symlink 仍被跟随

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：修复就绪｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 91](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-174 修了 lifecycle 下/entry 级 symlink，根级未修。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9d-notes-root-symlink.mts`。

## 症状

把整个 `notes/` 做成指向外部目录的 symlink：

```text
notes -> /outside-notes
```

外部目录里有合法 `README.md` 与 `implemented/2026-11-14-link.md`：

- `notesTreeProblems()` 返回 `problems: []`、`files: 2`；
- `notesStatusProblems()` 返回 `problems: []`、`checked: 1`；
- `pnpm verify` 的 `notes-tree` 放行。

即：树根本身是 symlink 时，门禁跟着它走，检查的是外部树；`notes/` 仓内实际内容为空。

## 根因（假设）

`notesTreeProblems()` / `notesStatusProblems()` 用 `isDirectory(join(root,'notes'))`，`statSync` 会跟随 symlink；随后 `readdirSync` 也跟随。BUG-174 只给 root 下的 entries / lifecycle 下的 children / receipts 下的 inner 加了 `isSymbolicLink()` 分支，没有对 `notes` 根做 `lstat`/symlink 判定。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9d-notes-root-symlink.mts
```

看 `tree { problems: [], files: 2 }`、`status { problems: [], checked: 1 }`。

## 影响 / 失败类

**失败类 12（文档/生成物指针）**：`notes/` 是决策记忆的根；根 symlink 让整棵树可以指向仓外/未审内容，而门禁只检查链接目标（或空目录）并全绿。与 BUG-174 同族，但层级更高：子条目 symlink 被拦，根 symlink 仍能绕过。

## 修复方向（不在本卡实施）

- 两处入口先 `lstatSync` 判 `notes` 根不是 symlink（也不跟随），是 symlink → 红；
- 或统一用 `safe-file`/`company-root` 的「root residency」判据；
- spec 覆盖 `notes` 根 symlink、`notes/implemented` 根 symlink、正常目录。

## 已修判定

```text
`notes` 根为 symlink → notes-tree 红（不跟随）；status 不把外部树计入受查集合
`notes/implemented` 为 symlink 同样红；正常目录不误判
红证：去掉根 lstat 判定 → problems [] / files 2 复现
```

判据由 `tests/checks/notes-tree.test.mjs` 的根 symlink 用例搭载；红证 = 去掉根判定。

## 证据

- `runtime/tmp/c9d-notes-root-symlink.mts` / `.log`：根 symlink 时 `files:2/checked:1` 且无问题。
- 代码：[notes-tree.mjs](../../checks/gates/notes-tree.mjs) 的 `notesTreeProblems()` / `notesStatusProblems()` 入口。
