---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-074：per-agent 注入用 WeakSet 短路，service re-provide 后 policy/workflow_runs 可能不重装

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note [`notes/implemented/2026-11-11-inject-reentrancy-false-positive.md`](../../../notes/implemented/2026-11-11-inject-reentrancy-false-positive.md)
> **审查**：agent — 根因证伪（误报）；inject-reentrancy spec 六项；红证 = 把 WeakSet 挪进 callback 1 failed

## 症状

`registerDelegationContracts` 与 `registerWorkflowRuns` 都是“`agent/created` 时 `agent.ctx.inject([...], cb)`，cb 里装 section/tool”，并用 `installed = new WeakSet()` 防止同一 Agent 重复安装：

- `packages/company-pack/src/host/prompt/delegation-contracts.ts` 的 `installed.has(agent) → return`；
- `packages/company-pack/src/host/delegation/workflow-runs.ts` 的 `installed.has(agent) → return`。

但 Cordis 的 `ctx.inject` 合同是：**required service 变化时 callback 会被 unload 再 re-run**：

> Run a callback once the requested services are available. … the callback is unloaded and re-run whenever a required service changes.
> — `vendor/dsh/vendor/cordis/src/registry.ts:168`-`180`

也就是说 `tools` / `systemPrompt` 被 re-provide（应用内插件 recomposition、live 安装/卸载、service 替换）时，旧 fiber 的 section/tool 会被清掉，callback 再跑；WeakSet 仍然命中，于是 **不再装 section / `workflow_runs`**。模型会静默失去 capability header/五段政策，vp-eng 系会静默失去 `workflow_runs`。同型守卫还在 `delegation-control.ts`（`fibers` map，预存在）。

## 根因（原假设）

把 `ctx.inject` 当成“每个 Agent 只跑一次的 setup”，用 WeakSet 去重；实际它是 **per-fiber 生命周期**——re-run 是正常路径，旧 effect 已由 fiber 清理，callback 必须重新注册。用“Agent 已安装过”做幂等键，恰好把正常的 re-run 变成 no-op。

## 根因证伪（2026-11-11）

用真 Cordis `Context` 重做实验：**provider fiber 卸载 + 新 fiber 再 provide**（re-provide 的真实形状）时，
`agent.ctx.inject` 的 callback 会重跑，**WeakSet 在位也照样重装** section/tool；只有把 WeakSet 挪进
callback 才会丢。卡里 `ctx.set('tools', …)` 的读数不是 re-provide：`ctx.set` 只覆盖同一 provider 的值，
**不通知依赖**（vendor `reflect.ts` 的 `set` 无 notify）。因此：

- 「WeakSet 把正常 re-run 变成 no-op」不成立——它只挡第二次 `agent/created` 建新 inject fiber，这是它该做的事。
- `ctx.set` 后新服务为空是 `set` 的语义，不是本包的安装被吞；DSH recomposition 走 provide/dispose，不走 `set` 替换这两个服务。
- `delegation-control.ts` 的 `fibers` map 同场景也不阻塞（inject callback 仍重跑）。

结论：**误报**（观察来自无效复现路径，根因不成立）。防线 = 保留 WeakSet 的正确位置 + 注释 +
keyless spec 钉住「re-provide 会重装、`ctx.set` 不会、重复 created 不重复装」。

## 暴露的失败类

**用一次性 guard 包住可重入生命周期**：`inject`/`plugin` 的 callback 是可能多次运行的；任何 `WeakSet`/`Map` “已安装”短路都要问：这个键是 Agent 还是 fiber？如果 effect 会随 fiber 释放，guard 不能放在 Agent 上。

**（2026-11-11 补）复现路径把 `ctx.set` 当 re-provide**：值替换不触发依赖重跑；recomposition 的真实形状是
provider 卸载/再挂。复现脚本必须命中消费者真正走的生命周期——这条比原假设更值得记住。

## 复现（原假设；`ctx.set` 读数真实，但不是 re-provide）

`runtime/tmp/orchestration-fit/a3-reinject-real.mjs` 用真实 `Context` + `ctx.set('tools', …)` / `ctx.set('systemPrompt', …)` 复现：

```text
after agent/created   sections=[header, spawn, fork, workflow, team, retry]  tools=[workflow_runs]
after ctx.set(tools)  sections=同上  toolsOld=[workflow_runs]  toolsNew=[]   ← 新 tools 服务里没有 tool
after ctx.set(systemPrompt)  oldSections=同上  newSections=[]              ← 新 systemPrompt 里没有 section
```

- tools 替换后，Agent 的 scope 读新 `tools` 服务 ⇒ `workflow_runs` 消失（old map 里的注册不可见）。
- systemPrompt 替换后，新 scope 没有任何 delegation section ⇒ header/五段政策消失。
- 反向：不替换服务时，A2/E5B/E5C 的 6 座位真挂载全绿；启动面不是问题。

## 修复方向（已撤回：根因不成立）

- ~~去掉 `installed`/WeakSet~~，直接依赖 `agent.ctx.inject` 的 fiber 生命周期：每次 callback 都装，旧 effect 由 fiber 清理；若需避免同 fiber 内重复，用 `scope.effect` 或 fiber 级键，不用 Agent 级 WeakSet。
- 或把注入包成 `agent.ctx.plugin({ inject, apply })` 并保存 fiber，在 service 变化时重建；不另造第二套生命周期。
- 同型修 `delegation-control.ts` 的 `fibers` map（预存在，非本次新引入）。
- 验收：keyless 模拟 service re-provide 后 section/tool 仍在（红→绿）；真实 recomposition 后 `request/header.tools`/`system/message` 仍含 `workflow_runs`/header；`vnpm test`+`verify` 绿。

## 已修判定

- 根因证伪记录在卡上（假设保留、不抹掉）；三处 WeakSet（`delegation-contracts` / `contracts` / `workflow-runs`）保留在 `agent/created` 外层并加注释：它只去重重复创建，不是 re-run guard。
- 真 Cordis spec `tests/host/index/inject-reentrancy.spec.ts`：re-provide 后 section/tool 重装；`ctx.set` 只换值不通知；重复 `agent/created` 不重复装；`delegation-control` 的 `fibers` map 同场景不阻塞（6 项绿）。
- 红证：把 WeakSet 挪进 callback（即原假设的形状）→ 该 spec **1 failed / 5 passed**；还原 → **6 passed**。
- `pnpm test` / `pnpm typecheck` / `pnpm verify` 绿。

## 修复关联

误报，已收口（2026-11-11）。发现于 [委派能力域化回归 + 探索卡](../settled_issues/2026-11-11-delegation-capability-scoping-regression-exploration.md)
A3 生命周期；Cordis 合同 = `vendor/dsh/vendor/cordis/src/registry.ts:168`-`180`；同型代码 =
`delegation-contracts.ts` / `workflow-runs.ts` / `delegation-control.ts`。
