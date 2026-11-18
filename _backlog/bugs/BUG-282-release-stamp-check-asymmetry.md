---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-282：stamp 与 check 的 docs-only 判据不对称（stamp 先改 gitSha，check 还看 artifact）

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`stamp` 只检查 manifest 后提交是否 docs-only；`check` 还检查 artifact/sha/checks。一个 docs-only 提交改 `_dist/安装手册.md` 可被 stamp，随后 check 可能因 artifact 手册指纹/检查项不同而红，或反之。

## 复现

静态：release.mjs 的 stamp/check 分支。

## 根因与证据

两个入口共享名字但判据不同。

## 失败类与同类排查

**失败类 = 发布收尾摩擦/假绿。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 docs-only 判定/artifact 校验抽成一份；stamp 与 check 同结论。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
