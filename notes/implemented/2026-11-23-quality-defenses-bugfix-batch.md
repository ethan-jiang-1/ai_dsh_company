状态：implemented（2026-11-23）；批准：用户 2026-11-23 批准 `BUG-333..350` 批次计划并启动 `/goal` 推进｜上游 = [BUG-342](../../_backlog/_archive/fixed_bugs/BUG-342-handbook-override-follows-symlinks-and-crashes-on-dir.md)

# 质量防线审查与探查批次收口（BUG-333..350 伞形记录）

## 决定

针对 2026-11-23 质量防线审查与构造探查发现的系统性问题，按根因聚类分 6 顺位收口（不逐卡打症状补丁）：

1. **顺位 1 · P1 安全读面收口（[BUG-342](../../_backlog/_archive/fixed_bugs/BUG-342-handbook-override-follows-symlinks-and-crashes-on-dir.md)）**：
   [`readHandbook`](../../packages/company-pack/src/host/prompt/handbook.ts) 读取 `.dsh-company/overrides/AGENTS.md` 改走共享安全读面 [`readCompanyFile`](../../packages/company-pack/src/host/run-bundle/company-root.ts)，拒绝叶子/中间段 symlink、目录及越界路径；遇 `unsafe` 时安全回退到 pack 默认 `content/AGENTS.md`，并在 [`registerHandbook`](../../packages/company-pack/src/host/prompt/handbook.ts) 记录 `logger.warn` 而非抛 `EISDIR` 打崩 `apply()`。

## 输掉的方案

- **在 `readHandbook` 内局部手写 `lstatSync` + `statSync`**：会与 [`company-root.ts`](../../packages/company-pack/src/host/run-bundle/company-root.ts) 形成第二套路径安全实现并漏掉 `.dsh-company/` 或 `overrides/` 中间段 symlink 校验；统一消费 `readCompanyFile`。
- **遇到非法 override 时直接 throw 打断注册**：会让模型可写面上的一个误建目录或链接整宿主砖掉；回退默认手册并告警既守住安全边界又不致砖。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| 手册覆盖安全读面 | [`readCompanyFile`](../../packages/company-pack/src/host/run-bundle/company-root.ts) | [`readHandbook`](../../packages/company-pack/src/host/prompt/handbook.ts) 消费；`registerHandbook` 经 `ctx.logger.warn` 上报 `unsafe` |

## 验证（真跑过）

- **BUG-342**：`pnpm test tests/host/prompt/handbook.spec.ts` —— 修复前 2 failed / 6 passed（外部 symlink 透传 `OUTSIDE_SECRET`、目录抛 `EISDIR`）；修复后 8/8 passed，联动 `pnpm typecheck`、`pnpm lint`（`company-static-audit` 141 文件 0 违规）及 `tests/host/contract/file-shape-agreement.spec.ts`（94/94）全绿。

## 未覆盖轴

- [covered] `readHandbook` 对叶子 symlink、中间段 symlink、目录及合法 override 的行为与 `registerHandbook` 降级日志 → [`tests/host/prompt/handbook.spec.ts`](../../tests/host/prompt/handbook.spec.ts)
- [policy] pack 自身只读 `content/AGENTS.md` 仍假定安装形态受包边界保护，不走 workspace `.dsh-company` 校验 → [`packages/company-pack/src/host/prompt/handbook.ts`](../../packages/company-pack/src/host/prompt/handbook.ts)
