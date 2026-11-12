---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-151：upgrade log 目标被 symlink/目录占用时跟随写外或裸抛 EISDIR

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — 红→绿（Safety 矩阵 134 passed）
>
> **关联**：[对抗性边界矩阵 P0](../settled_issues/2026-11-13-adversarial-shape-matrix-p0.md)（矩阵首跑）；BUG-149 的 upgrade log 只修了父目录，漏了叶子目标。
> **留痕**：Note [adversarial-shape-matrix](../../../notes/implemented/2026-11-13-adversarial-shape-matrix.md)

## 症状

Safety 矩阵 `log.write` 两例红：

- `leaf-symlink-out`：`appendRotatingLine(join(workspace, '.dsh-company/logs/company-pack-upgrade.log'), …)` 跟随 symlink，把 `x` 追加到 workspace 外的目标文件；
- `leaf-dir`：目标被目录占用时 `appendFileSync` 裸抛 `EISDIR`，不是 typed refusal。

## 根因（假设）

`appendUpgradeLog` 只把路径交给通用 `appendRotatingLine`；后者只保证 `.dsh-company` 父目录（BUG-149 的修复），不判叶子目标。`appendRotatingLine` 是通用 logger，不持有 workspace/公司盘语义，不能在那里做 residency。

## 暴露的失败类

**「父目录安全」被当成「整个路径安全」**：同一根路径里，父目录 check 与叶子 check 各修一半；日志这类非关键路径最容易漏。

## 复现

```sh
pnpm vitest run tests/host/contract/company-root-safety.spec.ts
```

修复前：`log.write > leaf-symlink-out` / `leaf-dir` 两例红。

## 修复

`appendUpgradeLog` 先 `companyFileProblem(workspace, BUNDLE_UPGRADE_LOG)`；`unsafe`（symlink/目录/越界）直接跳过，不跟随写外。日志不是关键路径，skip 优于抛错。

## 已修判定

- keyless：Safety 矩阵 **134 passed**（10 写入口 × 13 + 4 个零覆盖单测）。
- 红证：去掉 `appendUpgradeLog` 的 preflight → `leaf-dir` EISDIR + `leaf-symlink-out` 写外 2 红；还原绿。
- carrier：`bundle.write` / `log.append` / `log.rotating` 升入 `CARRIERS`，`KNOWN_GAP` 清零；门禁 PASS `knownGap 0`。
