---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-251：shipped vp-eng persona 让运行时 operator 跑 `pnpm methods:init`（dev 脚本）

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`presets/vp-eng/agent.cordis.yml` 的 persona 正文写「the operator runs `pnpm methods:init` first; if not installed, fail-closed」。安装后的公司 operator 没有 repo `package.json` 的 `methods:init` 脚本，这是运行时指令依赖开发脚本。

## 复现

直接读该 preset 行；`checkSourceShape`/`shipped-links` 仍绿（它们只判 dev 路径，不判 `pnpm` 命令）。


```sh
pnpm verify
```

## 根因与证据

文本门禁只扫 `tests|tools|checks|...` 路径；`pnpm <script>` 不在判据。C13/C14 把 pnpm 从 README 改成安装器依赖，但 preset persona 漏了。

## 失败类与同类排查

**失败类 = 运行时指令的可执行性没有载体。**

## 已修判定

修成什么算修好：

1. vp-eng persona 的 `pnpm methods:init` 改为运行时「安装方法包」。
2. 负例：source shape 扫到该命令 → 红；改后真实 source PASS。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/presets/vp-eng/agent.cordis.yml`
- 红：`pnpm verify`（persona 写 pnpm methods:init）
- 绿：`pnpm verify`（改成运行时「安装方法包」；source shape 扫 dev 命令）
- 提交：commit 82e23163
