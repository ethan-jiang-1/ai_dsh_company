---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-268：seed schema 只判 source/target 字符串，不判 target 安全/存在

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`jsonSchemaProblem` 的 seed 分支只要求 `source`/`target` 是字符串；`target:'../../evil.md'`、`source:'missing.md'` 都 PASS，`readSeeds` 会报越界/缺源。

## 复现

真实 tarball read 覆盖 seed.json 为上述对象 → checker `[]`。

## 根因与证据

schema 只做类型，不做 readSeeds 的安全/存在语义。

## 失败类与同类排查

**失败类 = 发布 schema 与运行时读取器不同义。**

## 已修判定

修成什么算修好：

1. seed 的 target 必须在 `.dsh-company/` 内、source 在 inventory、无重复；越界形态（绝对路径 / 盘符 / 反斜杠 / NUL / `..` 段）一律红。
2. 运行面 `readSeeds` 与合同**同义**：pack 不能 import `tools/lib`（发布面自包含），所以是两份渲染；等价矩阵 = `tests/tools/kb-seeds.spec.ts` 的「seed 路径越界：readSeeds 与 content 合同同义（BUG-268）」——同一批越界样本两边同时拒。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
