---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-182：fix-evidence 接受无操作命令当红/绿证据

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 91](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-175 把「假脚本」抠出来了，但 `sh -c`/`node 任意文件`/`git` 仍是空证据。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c9d-noop-command.mts`。

## 症状

一张 `已修` 卡的红/绿都写：

```text
- 红：`sh -c true`
- 绿：`sh -c true`
```

或 `node package.json` / `git status`，`fix-evidence` 全部 PASS：

```text
fix-evidence ×1 张新已修卡（改动面真实 + 红/绿齐 + 证据提交改到改动面）
```

这些命令要么什么都不做，要么只是打印/解析，不产生红→绿判据。

## 根因（假设）

`commandProblem()` 对 `sh` 只检查 `tokens[1]` 是否是存在路径；`-c` 以 `-` 开头被跳过 → `undefined`。对 `node` 只检查第一个非 `-` token 是否存在：`node package.json` 的 `package.json` 存在 → 通过。对 `git` 直接 `return undefined`（任何 git 子命令）。门禁只判「命令可解析」，不判「这条命令是否产生可观察的通过/失败」。

## 复现

```sh
node --import tsx/esm runtime/tmp/c9d-noop-command.mts
```

输出 `sh -c true`、`node package.json`、`git status` 三条均 `pass`、`problems: []`。

## 影响 / 失败类

**失败类 12（门禁判据）**：`fix-evidence` 的最后一道「红→绿真跑过」仍可被无操作命令满足；与 BUG-175 的假脚本同一类空证据，只是换了前缀。它降低了新门禁的可信度。

## 修复方向（不在本卡实施）

- 对 `sh -c` 要求脚本内容含真实命令（或直接拒绝 `-c`）；`sh <path>` 要求路径存在且在测试面；
- 对 `node` 要求目标在 `tests/` / `tools/` / `checks/` 等测试面，或后缀 `.mjs/.ts/.spec.ts`，不接受任意 JSON/配置文件；
- 对 `git` 只接受 `git diff`/`git show` 等能展示变更的子命令；`git status` 不算红→绿；
- spec 覆盖三条空命令。

## 证据

- `runtime/tmp/c9d-noop-command.mts` / `.log`：三条空命令 PASS。
- 代码：[fix-evidence.mjs](../../checks/gates/fix-evidence.mjs) 的 `commandProblem()`。
