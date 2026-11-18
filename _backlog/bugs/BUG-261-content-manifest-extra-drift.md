---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-261：content/manifest.json 与盘面 34 个文件不一致，无对账门禁

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`content/manifest.json` 列 50 个文件，盘上 84 个；34 个实际文件（charters/contracts/kb-setup/…）不在 manifest。manifest 自称「新增/重命名必须同 diff 更新」，但没有门禁对账。

## 复现

脚本比较 tiers 并集与 `content/**`：`listed 50 actual 84 missing 0 extra 34`。


```sh
pnpm verify
```

## 根因与证据

manifest 是手写声明；checker 只要求它 JSON 可解析，未与盘面对账。

## 失败类与同类排查

**失败类 = 声明与实盘漂移。**

## 已修判定

修成什么算修好：

1. content-manifest gate 对 inventory 与盘面双向求差：extra/missing 红。
2. 负例：盘上多/少一件 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`checks/gates/content-manifest.mjs`、`packages/company-pack/content/manifest.json`
- 红：`pnpm verify`（盘上 34 件不在 manifest 无门禁）
- 绿：`pnpm verify`（inventory 双向对差红）
- 提交：commit 82e23163
