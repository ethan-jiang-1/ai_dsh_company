---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-175：fix-evidence 只认命令前缀，不存在的脚本也能充当红/绿证据

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 90](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；fix-evidence 的目标是「只翻卡 + git mv 不算修复」。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9c-gate-edges.mts`。

## 症状

一张 `已修` 卡的红/绿都写：

```text
- 红：`pnpm definitely-not-a-real-script-xyz`
- 绿：`pnpm definitely-not-a-real-script-xyz`
```

`pnpm` 仓库里没有这个脚本（也没有对应文件），但 `fix-evidence` 仍 PASS：

```text
fix-evidence ×1 张新已修卡（改动面真实 + 红/绿齐 + 证据提交改到改动面）
```

## 根因（假设）

`commands(text)` 只匹配反引号里以 `pnpm|node|npx|vitest|sh|git ` 开头的字符串；`checkCard()` 只比较红/绿是否**同一条字符串**，不检查：
- `pnpm <script>` 的 script 是否在 `package.json` / 工作区；
- `node <path>` 的 path 是否存在；
- 该命令是否真会跑到改动面。

所以「同一条假命令」可以满足红→绿形状。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9c-gate-edges.mts
```

看 `fake command gate { pass: 'fix-evidence ×1 …', problems: [] }`；同一 card 的 `pnpm definitely-not-a-real-script-xyz` 在仓库不存在。

## 影响 / 失败类

**失败类 12（门禁判据）**：fix-evidence 是「修是否发生」的最后机械点；只校验前缀让「填一条不存在的命令」也能过，和当初「只翻状态 + git mv」是同一类空证据，只是多了一层形状。它降低的是门的可信度，不是某条产品行为。

## 修复方向（不在本卡实施）

- `pnpm <script>`：查根/包 `package.json` 的 scripts（含 `test`、`test:checks` 等已知入口）；
- `node <path>`：查路径存在；`vitest`：查配置文件/测试路径存在；
- 或要求命令带 `--filter`/具体 spec 路径并在盘上校验；
- 负例：假脚本名 → 红；真脚本 → 绿。

## 证据

- `runtime/tmp/c9c-gate-edges.mts` / `.log`：假 `pnpm` 脚本 PASS。
- 代码：[fix-evidence.mjs](../../checks/gates/fix-evidence.mjs) 的 `commands()` / `checkCard()`。
