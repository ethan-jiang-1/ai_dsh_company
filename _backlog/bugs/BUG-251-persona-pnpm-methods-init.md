---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-251：shipped vp-eng persona 让运行时 operator 跑 `pnpm methods:init`（dev 脚本）

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`presets/vp-eng/agent.cordis.yml` 的 persona 正文写「the operator runs `pnpm methods:init` first; if not installed, fail-closed」。安装后的公司 operator 没有 repo `package.json` 的 `methods:init` 脚本，这是运行时指令依赖开发脚本。

## 复现

直接读该 preset 行；`checkSourceShape`/`shipped-links` 仍绿（它们只判 dev 路径，不判 `pnpm` 命令）。

## 根因与证据

文本门禁只扫 `tests|tools|checks|...` 路径；`pnpm <script>` 不在判据。C13/C14 把 pnpm 从 README 改成安装器依赖，但 preset persona 漏了。

## 失败类与同类排查

**失败类 = 运行时指令的可执行性没有载体。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 persona/skill 里的 `pnpm`/`node tools`/`run/env.sh` 等 dev 命令纳入 source shape（或改成运行时命令）；最少这一处 fail-closed 文案改成「安装方法包后」的运行时入口。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
