# 基石整治交接（Entry/Execution Remediation Handoff）

状态：入口/执行 Markdown 收敛与 keyless 测试分层修正已完成；本交接材料不作为长期流程入口。

> 本文是交接与范围记录，不是符合目录准入条件的事故复盘；保留编号后缀仅为沿用 `notes/postmortem/` 的文件命名形式。

## 当前事实家

- 入口与任务分支：根 [`AGENTS.md`](../../AGENTS.md) → [`docs/index.md`](../../docs/index.md) → [开发环 §0.5](../../docs/guides/dev-loop.md)。明确任务按用户范围进入；只有用户要求继续下一项时才读 [ROADMAP 队列](../implemented/2026-09-28-roadmap-retirement.md)；恢复任务先读原 Note 与现场。
- 实施、验证与交接：[开发环 §1/§9.1/§12](../../docs/guides/dev-loop.md)。feature 队列项默认 Plan Mode 呈批是本仓适配；已批准的具体计划按授权范围执行，明确授权的机械单步可直接做。
- 决策与理由：[D23/D24 研究 Note](../implemented/2026-09-23-dsh-inround-task-surface.md)；D26 卫生原则见 [index D26](../../docs/index.md)。
- 本轮收尾记录：[基础入口与执行链 Note](../implemented/2026-09-24-foundation-remediation.md)。

## 验证与边界

- `git diff --check`：通过。
- `pnpm verify`：指南措辞同步和 handoff 移动后通过。
- `pnpm test`：最终 17 个 spec 文件、157 项全通过。原有 CLI 子进程场景从 Vitest 移至 `node scripts/snapshot-motion-smoke.mjs`（keyless、临时隔离 fixture）；`tests/workspace-oracle.spec.ts` 保留纯逻辑覆盖。定向 14 项全通过，CLI smoke 通过。未运行真模型/浏览器认证。
- `vendor/dsh` 子模块工作树干净，SHA 保持 `fb2c4b9e698e30edb738bca4cf0618587db7d203`。
- 相关提交：`fb23bfa`（snapshot/COO 检查澄清）、`75d7352`（入口/执行文档收敛）、`5e6cd27`（CLI smoke 分层修复）。
