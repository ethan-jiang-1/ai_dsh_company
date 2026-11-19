---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-266：content-manifest gate 的 allFiles 跳过 symlink 文件，symlink content 可绕过 inventory

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`allFiles` 用 `entry.isFile()`；symlink 返回 false，不进 disk 集合。一个 content 下的 symlink 文件可以存在但不在 inventory，gate 仍绿；checker 只读 inventory 也不看。

## 复现

静态：`checks/gates/content-manifest.mjs` 的 `allFiles`；合成 content + symlink。

## 根因与证据

门禁只枚举普通文件，symlink 面没判。

## 失败类与同类排查

**失败类 = 载体面缺口。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

allFiles 显式判 symlink（warning/拒）或跟随并登记；负控 symlink content 文件 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`checks/gates/content-manifest.mjs`、`tools/lib/company/content-contract.mjs`、`tests/checks/gates-negative.test.mjs`
- 红：`pnpm test:checks`（还原 gate 到 HEAD：symlink 文件静默跳过 → 「symlink 文件 → 红」用例 FAIL）
- 绿：`pnpm test:checks`（ALL PASS：`content 下出现 symlink` 红）
- 提交：commit d13a0eb0
