---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-074：per-agent 注入用 WeakSet 短路，service re-provide 后 policy/workflow_runs 可能不重装

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

`registerDelegationContracts` 与 `registerWorkflowRuns` 都是“`agent/created` 时 `agent.ctx.inject([...], cb)`，cb 里装 section/tool”，并用 `installed = new WeakSet()` 防止同一 Agent 重复安装：

- `packages/company-pack/src/host/prompt/delegation-contracts.ts` 的 `installed.has(agent) → return`；
- `packages/company-pack/src/host/delegation/workflow-runs.ts` 的 `installed.has(agent) → return`。

但 Cordis 的 `ctx.inject` 合同是：**required service 变化时 callback 会被 unload 再 re-run**：

> Run a callback once the requested services are available. … the callback is unloaded and re-run whenever a required service changes.
> — `vendor/dsh/vendor/cordis/src/registry.ts:168`-`180`

也就是说 `tools` / `systemPrompt` 被 re-provide（应用内插件 recomposition、live 安装/卸载、service 替换）时，旧 fiber 的 section/tool 会被清掉，callback 再跑；WeakSet 仍然命中，于是 **不再装 section / `workflow_runs`**。模型会静默失去 capability header/五段政策，vp-eng 系会静默失去 `workflow_runs`。同型守卫还在 `delegation-control.ts`（`fibers` map，预存在）。

## 根因（假设）

把 `ctx.inject` 当成“每个 Agent 只跑一次的 setup”，用 WeakSet 去重；实际它是 **per-fiber 生命周期**——re-run 是正常路径，旧 effect 已由 fiber 清理，callback 必须重新注册。用“Agent 已安装过”做幂等键，恰好把正常的 re-run 变成 no-op。

## 暴露的失败类

**用一次性 guard 包住可重入生命周期**：`inject`/`plugin` 的 callback 是可能多次运行的；任何 `WeakSet`/`Map` “已安装”短路都要问：这个键是 Agent 还是 fiber？如果 effect 会随 fiber 释放，guard 不能放在 Agent 上。

## 复现（待补真装配）

- 代码级：跑 `runtime/tmp/orchestration-fit/a3-reinject-bug.mjs`（fake inject 手工 re-run）能看到“callback 再跑但 section/tool 不重装”的形状；但 fake 不具备真实 effect 释放，**不能单独当 red**。
- 真装配待补：在 company profile 里 live re-provide `tools`/`systemPrompt`（或插件 recomposition），读受影响 Agent 的 `request/header.tools` + `system/message`：重装前有、re-provide 后应无（bug）；`vp-eng` 的 `workflow_runs` 同。
- 反向：若不 re-provide，当前 6 座位真挂载全绿（A2/E5B/E5C），说明不是启动面问题。

## 修复方向（未授权）

- 去掉 `installed`/WeakSet，直接依赖 `agent.ctx.inject` 的 fiber 生命周期：每次 callback 都装，旧 effect 由 fiber 清理；若需避免同 fiber 内重复，用 `scope.effect` 或 fiber 级键，不用 Agent 级 WeakSet。
- 或把注入包成 `agent.ctx.plugin({ inject, apply })` 并保存 fiber，在 service 变化时重建；不另造第二套生命周期。
- 同型修 `delegation-control.ts` 的 `fibers` map（预存在，非本次新引入）。
- 验收：keyless 模拟 service re-provide 后 section/tool 仍在（红→绿）；真实 recomposition 后 `request/header.tools`/`system/message` 仍含 `workflow_runs`/header；`vnpm test`+`verify` 绿。

## 修复关联

未修。发现于 [委派能力域化回归 + 探索卡](../issues/2026-11-11-delegation-capability-scoping-regression-exploration.md)
A3 生命周期；Cordis 合同 = `vendor/dsh/vendor/cordis/src/registry.ts:168`-`180`；同型代码 =
`delegation-contracts.ts` / `workflow-runs.ts` / `delegation-control.ts`。
