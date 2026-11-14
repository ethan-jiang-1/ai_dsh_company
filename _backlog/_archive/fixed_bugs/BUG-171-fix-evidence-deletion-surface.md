---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-171：fix-evidence 拒绝删除型修复——改动面路径已不在盘上

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 90](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；`fix-evidence` 是 2026-11-14 新增的「修 = 改动面 + 红→绿 + 可对账提交」门禁。
> **留痕**：Note [2026-11-14-shape-state-machine-and-gate-edges.md](../../../notes/implemented/2026-11-14-shape-state-machine-and-gate-edges.md)（同轮八卡）；复现脚本 = `runtime/tmp/c9c-fix-evidence.mts`。

## 症状

一次**删除文件**的修复（例如删掉 `packages/company-pack/src/lib/` 下的死代码文件）在卡上写：

```text
- 改动面：<被删除文件的路径>
```

提交确实删除了该文件、`git show --name-only` 也列出它，但 `fix-evidence` 先 `existsSync` 判「改动面真实存在」，于是红：

```text
BUG-999-test.md 的改动面 packages/company-pack/src/lib/dead.ts 不在盘上
```

删除型修复无法用被删路径作为改动面；当前只能改写成父目录才可能过门。

## 根因（假设）

`checkCard()` 对 `surfaces` 的每个路径做 `existsSync(join(root, path))`；这个判据假设修复一定**新增/保留**文件，未考虑删除/重命名。提交侧的 `changed` 已经能证明路径在提交里出现（包括删除），存在性检查是额外且方向错误的约束。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9c-fix-evidence.mts
```

看 `deletion gate` 的 `problems: [ ... 不在盘上 ]`；同一提交的 `git show --name-only` 含 `dead.ts`。

## 影响 / 失败类

**失败类 12（文档/门禁判据）**：合法的删除型修复被门禁判红，逼人写不真实的改动面（父目录）来绕过；门禁的语义变成「必须存在」，而不是「必须在那次提交里改到」。

## 修复方向（不在本卡实施）

- 去掉 `existsSync` 硬判，改为「路径在提交 changed 列表里」或「路径存在**或**在提交里被删除/重命名」；
- 若要保留存在性检查，允许 `- 改动面：` 标 `deleted:` / 用父目录并说明；
- 自测补「删除」「重命名」两形状。

## 已修判定

```text
删除型修复：证据提交删除了 `dead.ts`，卡上 `- 改动面：dead.ts` → 门禁绿（不再「不在盘上」）
路径既不存在也不在证据提交里 → 仍红（对账失败）
红证：还原 existsSync 硬判 → 删除用例红
```

判据由 `tests/checks/fix-evidence.test.mjs` 的删除/不存在两形状搭载；红证 = 恢复存在性硬判。

## 修复证据

- 改动面：`checks/gates/fix-evidence.mjs`、`tests/checks/fix-evidence.test.mjs`
- 红：还原 `existsSync` 硬判 → `node tests/checks/fix-evidence.test.mjs` 红（删除型用例 not ok）
- 绿：去掉硬判、改由提交 changed 对账 → `node tests/checks/fix-evidence.test.mjs` 绿（13 passed）
- 提交：commit d6aa860d

## 证据

- `runtime/tmp/c9c-fix-evidence.mts` / `.log`：删除提交的 gate 红「不在盘上」。
- 代码：[fix-evidence.mjs](../../../checks/gates/fix-evidence.mjs) 的 `checkCard()`。
