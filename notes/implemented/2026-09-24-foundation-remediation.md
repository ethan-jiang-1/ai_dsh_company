# 基石整治：Agent 入口链与执行链

状态：implemented（完成入口/执行 Markdown 收敛，并修正 keyless 测试分层）

## 目标与范围

让 Agent 从根入口能找到本次任务该读的事实家，并按授权完成最窄实施、验证和交接。

- **入口 owner**：根 `AGENTS.md` 负责路由；`docs/index.md` 负责导航与决定适用范围；用户要求继续队列时，`ROADMAP.md` 是活动/暂停项的唯一调度家；相关 Note 与合同按任务主题读取。
- **执行 owner**：`docs/guides/dev-loop.md` §0.5 定义任务分支与授权，§1 定义实施/验证/交接，§12 定义记录与收尾。
- **当前授权规则**：feature 队列条目默认先 Plan Mode 呈批，获批后按范围实施；用户已批准具体计划时不重复求批；明确授权的机械单步可直接做。多步任务用 `todo_write`，简单单步可省。此为本仓适配；DSH 机制依据仍以钉住的 vendor 为准。
- **范围外**：不处理公司角色手册、业务内容、生产行为变更、真模型/浏览器认证或 vendor；本轮仅为保持 Vitest keyless 而把 CLI 集成检查移到独立 smoke。

## 验收

1. 明确指定任务：按用户范围进入对应 owner，不从队列另取任务；已授权的小修可直接执行。
2. “继续下一条”：只读活动队列；若仅有暂停项，报告阻塞与复活条件后停止，不从历史推任务。
3. 恢复未完成项：读取原任务 Note，核对相关合同、diff 和必要现场，从未完成/未验证缺口继续。
4. 三种分支都能找到唯一任务/授权规则、实施验证规则和交接规则；其他入口文件只做短路由，不复制一套执行流程。
5. 文档不把历史决定写成当前指令，不把结构检查/旧绿灯当作运行验收；完成、未验证、未完成分别可辨。

## 决定

- 执行链细则由 `docs/guides/dev-loop.md` 唯一拥有；其他文件只保留职责路由或指向，不重复流程正文。
- 按 D26 清理失效、重复、无继续指导价值的文字；保留仍解释当前边界、约束或证据来源的历史决定。行数不作为目标。

## 已作调整

- 根 `AGENTS.md` 收敛为入口与 owner 指针；不在根重复开发步骤。
- `docs/index.md` 精简 D23/D24 的当前适用说明，并将开发环列为执行规则 owner。
- `ROADMAP.md` 文件头只说明队列职责，并把 Plan Mode 细则指向开发环；历史段不作为当前入口。
  （2026-09-26 更新：该历史段已整体删除，见 [技术债清扫 RFC](../proposed/2026-09-26-entry-execution-chain-debt.md) B8/S1；本句留作当时的决定记录。）
- `docs/guides/dev-loop.md` 已收敛 §0/§0.5/§1/§12：入口分支、Plan Mode 适用条件、实施节奏与交接规则各有明确位置。
- D23 转型 Note 的当前形态表改为指向现行流程，避免把旧队列形状当作现在规则。

## 验收记录

- 人工复核入口链：明确任务按用户范围进入；“继续下一条”才读队列；恢复任务从原 Note、合同和现场确认缺口。
- 执行规则集中在开发环 §0.5/§1/§12；Plan Mode feature 默认明确标为本仓政策，并区分获批计划和授权机械单步。
- `git diff --check`：通过。
- `pnpm verify`：通过（指南措辞同步后复跑）；含 Markdown 编码/换行、链接、文档预算与结构门禁。
- `pnpm test`：17 个 spec 文件、157 项全部通过。修正旧指南短语断言；CLI 子进程场景移出 Vitest，改由 `scripts/snapshot-motion-smoke.mjs` 覆盖，纯逻辑用例留在 `workspace-oracle.spec.ts`。
- `pnpm exec vitest run tests/layering.spec.ts tests/workspace-oracle.spec.ts`：14 项通过；`node scripts/snapshot-motion-smoke.mjs`：通过。未运行真模型/浏览器认证。
- `vendor/dsh` 保持 SHA `fb2c4b9e698e30edb738bca4cf0618587db7d203` 且工作树干净。

## 范围外

公司角色/业务文档、生产行为、真模型/浏览器认证、vendor 与全仓应用历史未纳入；仅改测试分层和 snapshot-motion CLI smoke，以维持 Vitest keyless 约定。

## 交接边界

本 Note 记录基础流程 Markdown 与 keyless 测试分层收尾，不认证真模型/浏览器行为。
