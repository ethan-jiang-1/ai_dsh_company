---
status: 已修
severity: P1
opened: 2026-11-14
---

# BUG-161：pre-push 逐提交 diff-tree 漏 merge 提交的合并结果

> 严重级别：P1（重要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 89](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-158 修了 zero-SHA 范围，但新分支逐提交 `diff-tree` 没有覆盖 merge 提交的合并结果。
> **留痕**：Note [2026-11-14-shape-layer-and-structure-semantics.md](../../../notes/implemented/2026-11-14-shape-layer-and-structure-semantics.md)（同轮八卡）；复现脚本 = `runtime/tmp/c9-merge-probe.sh`。

## 症状

新分支首次 push（remote 全零）时，若 tip 是 merge 提交，且**冲突解决/合并结果**里改了一个 surface 文件：

- `pathsOfRef()` 对每个出站提交跑 `git diff-tree --root --no-commit-id --name-only -r <sha>`；
- 对 merge 提交，`diff-tree` 默认不输出与父提交的差异（除非 `-m`/`-c`/`--cc`）；
- 合并只在 merge 提交里引入的 client 文件因此不可见，脚本打印「本次未触发面级检查」，`client-load` 没跑。

实测：临时仓库的 merge 提交 `eae24ea` 在合并结果里加了 `packages/company-pack/src/client/wiring/error-ring.ts`；`git diff-tree` 对该提交无输出，dry-run 结果为「未触发」。

## 根因（假设）

[pre-push-surfaces.mjs](../../../checks/pre-push-surfaces.mjs) 的 `pathsOfRef()` 把「每个提交的 `diff-tree`」当作完整变更集；merge 提交需要 `-m`（逐父）或 `--cc`/`git show --first-parent` 等形状，当前没有。

## 复现

```sh
runtime/tmp/c9-merge-probe.sh
```

输出含 `merge=eae24ea`、`git log --graph` 的 merge 结构，以及：

```text
pre-push surfaces: 本次未触发面级检查（规则表 = tools/lib/asset-lanes.mjs SURFACE_RULES）
```

## 影响 / 失败类

**失败类 8/12（子进程 + 门禁选择）**：merge 是功能分支的常见形状；冲突解决引入的代码改动没跑对应真入口检查，属于假绿。与 BUG-158 的 zero-SHA 假绿同族但形状不同（merge 的合并结果）。

## 修复方向（不在本卡实施）

- merge 提交用 `git diff-tree -m --first-parent`（或 `git show --cc`）取合并结果；
- 或对出站范围直接 `git diff <merge-base> <local>`（一次覆盖范围，不逐提交）；
- 自测补一条 merge 形状，断言 merge-only 的 client 改动能带出 `client-load`。

## 已修判定

```text
新分支首次 push、tip 是 merge 提交、合并结果新增 client 文件 → dry-run 必须印出 client-load
非 merge 提交 / 普通 push（remote 非零）→ 行为不变
删除 ref → 仍跳过（BUG-158 不回归）
```

判据由 `tests/checks/pre-push-surfaces.test.mjs` 的 merge 形状搭载；红证 = 去掉 merge 分支（回退到单 `diff-tree`）→ 该用例印「未触发」变红。

## 修复证据

- 改动面：`checks/pre-push-surfaces.mjs`、`tests/checks/pre-push-surfaces.test.mjs`
- 红：删 `commitPaths` 的 merge 分支（回退成单 `diff-tree`）→ merge 用例 `not ok 4`，其余 3 条仍绿
- 绿：接回「合并结果 vs 第一父」→ `node tests/checks/pre-push-surfaces.test.mjs` 4 passed
- 提交：commit 85e6fec9
## 证据

- `runtime/tmp/c9-merge-probe.sh` / `runtime/tmp/c9-merge.log`：merge 结果含 client 文件，脚本未触发。
- 代码：[pre-push-surfaces.mjs](../../../checks/pre-push-surfaces.mjs) 的 `pathsOfRef()`。
