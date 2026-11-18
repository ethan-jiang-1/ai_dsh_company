---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-252：checkSourceShape 不扫 `pnpm`/dev 命令，只扫路径

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`checkSourceShape` 的 `devPathInLine` 只匹配 `tests|probes|tools|checks|_backlog|notes|docs` 路径；`pnpm methods:init`、`node tools/...`（无路径扩展名）等指令不判。

## 复现

对真实 source 跑 `checkSourceShape` 返回 `[]`（含 BUG-251 的 persona）；`shipped-links` PASS。

## 根因与证据

文本判据以「路径」为中心，不以「命令是否随包可执行」为中心。

## 失败类与同类排查

**失败类 = 文本面缺口；与 BUG-251 同根但载体不同。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

增加 dev-command 判据（`pnpm <script>` 非安装器脚本、`node tools|checks|tests`、`run/env.sh`），带合理白名单；命中 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
