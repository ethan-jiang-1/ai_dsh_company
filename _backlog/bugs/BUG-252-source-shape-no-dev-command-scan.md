---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-252：checkSourceShape 不扫 `pnpm`/dev 命令，只扫路径

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`checkSourceShape` 的 `devPathInLine` 只匹配 `tests|probes|tools|checks|_backlog|notes|docs` 路径；`pnpm methods:init`、`node tools/...`（无路径扩展名）等指令不判。

## 复现

对真实 source 跑 `checkSourceShape` 返回 `[]`（含 BUG-251 的 persona）；`shipped-links` PASS。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

文本判据以「路径」为中心，不以「命令是否随包可执行」为中心。

## 失败类与同类排查

**失败类 = 文本面缺口；与 BUG-251 同根但载体不同。**

## 已修判定

修成什么算修好：

1. `checkSourceShape` 扫非注释行的 `pnpm <script>`/`node tools|checks|tests`/`run/env.sh`，安装器命令白名单。
2. 负例：README.shipped 写 `pnpm methods:init`/`node tools/...` → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（dev 命令不判）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（pnpm/node tools/run/env.sh 非注释行红）
- 提交：commit 82e23163
