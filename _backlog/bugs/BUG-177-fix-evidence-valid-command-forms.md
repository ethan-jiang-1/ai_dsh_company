---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-177：fix-evidence 命令解析把合法形态判成不可执行

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 91](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-175 修了「假脚本」，解析变严后误伤合法命令。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9d-fix-evidence-command.mts`。

## 症状

以下都能在本仓真实执行，但 `fix-evidence` 判「命令不可执行」：

| 命令 | 门禁报错 |
|---|---|
| `pnpm run test` | `pnpm 没有脚本 run` |
| `pnpm --filter ai-dsh-company test` | `pnpm 没有脚本 ai-dsh-company` |
| `node --import tsx/esm runner.mjs` | `node 目标不存在：tsx/esm` |

同卡把命令改成 `pnpm test` 即 PASS。

## 根因（假设）

`commandProblem()` 对 `pnpm` 取 `tokens.slice(1).find(token => !token.startsWith('-'))`，把 `run` / `--filter` 的值当脚本名；对 `node` 同样取第一个非 `-` token，把 `--import` 的**值** `tsx/esm` 当目标路径。它没有按各命令的实际参数语法解析「选项 + 值」与「脚本/入口」的位置。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9d-fix-evidence-command.mts
```

输出四种命令的 gate 结果：`pnpm test` PASS；其余三条 `红/绿命令不可执行`。

## 影响 / 失败类

**失败类 12（门禁判据）**：`fix-evidence` 会把合法的红→绿证据判红，逼人改写成门禁认识的窄形态（如把 `pnpm run test` 改成 `pnpm test`），证据与真实执行命令不再一致。修复的「可对账」被门禁的解析器扭曲。

## 修复方向（不在本卡实施）

- 按命令语法解析：`pnpm [run] <script>`、`pnpm --filter <pkg> [run] <script>`、`pnpm exec <bin>`；`node [--import <mod>] <path>`；
- 参数值不参与「脚本/路径」选择；只对最终 script/path 做存在性检查；
- spec 覆盖 `pnpm run` / `--filter` / `node --import` / `npx --yes` 四形态。

## 证据

- `runtime/tmp/c9d-fix-evidence-command.mts` / `.log`：三条合法命令红。
- 代码：[fix-evidence.mjs](../../checks/gates/fix-evidence.mjs) 的 `commandProblem()`。
