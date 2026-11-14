---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-158：pre-push 按面选择在 zero SHA 场景漏检/崩溃

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿证据见 `## 已修判定`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 86](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C9-H1）；pre-push 是 2026-11-13 新增的「改到哪个面就必须跑哪条真入口」机械门。
> **留痕**：Note [2026-11-14-eight-bug-second-sources.md](../../../notes/implemented/2026-11-14-eight-bug-second-sources.md)（同轮八卡）；复现证据 = `runtime/tmp/c8-round1.mts` 之外的 `runtime/tmp/c9-delete.log` 与合成分支。

## 症状

同一段范围计算在两种 zero-SHA 场景出错：

1. **新分支首次 push**（remote sha 全零）：脚本只对 `localSha` 做 `git diff-tree <local>`，只看到 tip **自身**的变更。合成分支的父提交 `63a78db0` 改了 `packages/company-pack/src/client/wiring/error-ring.ts`，tip `bd8eff1` 只加一条 docs note；dry-run 输出「本次未触发面级检查」，`client-load` 没有跑。
2. **删除分支**（local sha 全零）：脚本走 `git diff --name-only <remoteSha> <localSha>`，`localSha = 000…` → `fatal: bad object 000…`，pre-push 直接失败。

## 根因（假设）

`checks/pre-push-surfaces.mjs` 的范围分支只判断 remote 是否为零：

```js
const diff = remoteSha && !isZero(remoteSha)
  ? git(['diff', '--name-only', remoteSha, localSha])
  : git(['diff-tree', '--no-commit-id', '--name-only', '-r', localSha])
```

- 零 remote 时没有取 merge-base/空树范围，只 diff tip 的父提交，漏掉分支里更早的提交；
- 零 local（删除 ref）没有跳过，仍调用 diff，触发 `bad object`。

## 复现

新分支形状（合成分支；`bd8eff1` 的树 = 只加一条 docs note）：

```sh
printf 'refs/heads/feat bd8eff102543f2a32d3de2a6fde0070236ee8b61 refs/heads/feat 0000000000000000000000000000000000000000\n' \
  > runtime/tmp/c9-newbranch-refs
node checks/pre-push-surfaces.mjs --stdin runtime/tmp/c9-newbranch-refs --dry-run
# → 本次未触发面级检查；而 git diff 63a78db0^ bd8eff1 能看到 client/error-ring.ts
```

删除分支形状：

```sh
printf '(delete) 0000000000000000000000000000000000000000 refs/heads/feat 5d6920d01fc3a63ba3e68e25c9acb61d06a8b69a\n' \
  > runtime/tmp/c9-delete-refs
node checks/pre-push-surfaces.mjs --stdin runtime/tmp/c9-delete-refs --dry-run
# → Error: git diff ... 0000... 失败：fatal: bad object
```

## 影响 / 失败类

**失败类 8/12（子进程/门禁选择）**：新分支首次 push 是功能分支最常见的形状；漏检会把「没跑真入口」伪装成「未触发」，是假绿。删除分支被崩掉是假红，挡住正常清理。

## 修复方向（不在本卡实施）

- remote 全零：用 `git merge-base`（有 upstream）或空树/`git diff-tree --root` 覆盖该分支全部提交，而不是只 diff tip。
- local 全零（删除）：跳过该 ref，不调用 diff。
- 把两种 stdin 形状做成自测（`tests/checks/` 或 `checks/audit` 的纯函数测试），避免靠手工。

## 已修判定

```text
新分支首次 push（remote 全零）：父提交改 client、tip 只改 docs → dry-run 必须印出 client 面
删除 ref（local 全零）     → 跳过该 ref，不跑 git diff、退出码 0
普通 push（remote 非零）    → 仍取 <remote>..<local> 范围（不回归）
无 stdin 手动直跑           → 仍明确打印「退化为 HEAD~1」
```

判据由 `tests/checks/pre-push-surfaces.test.mjs` 搭载（临时 git 仓库 + 真脚本子进程；`pnpm test:checks`）；红证 = 还原旧范围分支 → 新分支用例印「未触发」、删除 ref 用例 `bad object` 崩。

## 证据

- `runtime/tmp/c9-delete.log`：`git diff --name-only 5d6920d… 000… 失败：fatal: bad object 000…`。
- 合成分支 `bd8eff1`：`git diff-tree` 只列 `notes/implemented/zz-focus-probe.md`；`git diff 63a78db0^ bd8eff1` 列 `packages/company-pack/src/client/wiring/error-ring.ts`。
- 代码：[pre-push-surfaces.mjs](../../../checks/pre-push-surfaces.mjs#L52)。
