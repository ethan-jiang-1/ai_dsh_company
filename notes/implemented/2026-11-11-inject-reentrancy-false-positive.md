# 2026-11-11 · BUG-074 证伪：WeakSet 不挡 inject 重跑，`ctx.set` 不是 re-provide

状态：implemented（2026-11-11；上游 = BUG-074；负知识 + 守卫钉子，无产品行为变化）
上游 = [BUG-074](../../_backlog/_archive/fixed_bugs/BUG-074-per-agent-inject-not-reinstalled-on-service-change.md)

## 决定

1. **保留三处 `WeakSet` 在 `agent/created` 外层**（`delegation-contracts` / `contracts` / `workflow-runs`）。
   它们只去重重复的 `agent/created`（同一次创建事件建第二个 inject fiber 会重复 section/tool），
   **不是** re-run guard；位置不动。
2. **`ctx.inject` 的重跑由 fiber 生命周期管**：provider fiber 卸载、新 fiber 再 provide 时，依赖的
   inject fiber 会 unload 再 re-run，旧 effect 随 fiber 清理，callback 自然重装。无需 Agent 级幂等键。
3. **不把 `ctx.set` 当 re-provide**：`ctx.set(name, value)` 只覆盖同一 provider 的值，不通知依赖
   （vendor `reflect.ts` 的 `set` 无 notify）。卡里“新服务为空”是 `set` 的语义，不是安装被吞。
4. **防线 = 真 Cordis spec** `tests/host/index/inject-reentrancy.spec.ts`：六项钉住
   「re-provide 会重装（WeakSet 在位）」「`ctx.set` 不通知」「重复 `agent/created` 不重复装」
   「`delegation-control` 的 `fibers` map 不阻塞重跑」；三处 WeakSet 旁加注释指向本 Note。
5. 没有删除/移动任何 guard，也没有新增产品行为。

## 输掉的方案

- **按原卡去掉 WeakSet**：无收益；去掉后重复 `agent/created` 会建两个 inject fiber，同名 section/tool
  冲突。原卡的症状不是它造成的。
- **把 WeakSet 挪进 callback**：正是原假设的形状；实测 `delegation contracts` 用例 **1 failed / 5 passed**，
  证明 spec 挡得住这种改法。
- **给 `ctx.set` 造 notify 补丁**：vendor 层（`reflect.ts`/服务契约），本仓不 patch；如上游提供“值替换
  也重跑依赖”或明确 recomposition 只用 provide/dispose，再按新合同复核。

## 后果

- 若上游将来用 `ctx.set` 替换 `tools`/`systemPrompt`（而不是卸载/重挂 provider），依赖不会重跑，
  section/tool 会静默消失——那是 **vendor seam**，不是本包能修的；本 Note 留作 watch 项。
- `delegation-control.ts` 的 `fibers` map 经同场景证明不阻塞 callback re-run，保持原样。
- 三处 WeakSet 的注释把“键是 Agent 还是 fiber”的判据写在使用点，降低再次误诊的概率。

## 验证（实跑）

**红→绿（证伪的形状）**：把 `delegation-contracts.ts` 的 WeakSet 从 `agent/created` 外层挪进 inject
callback → `tests/host/index/inject-reentrancy.spec.ts` **1 failed / 5 passed**（新 `systemPrompt`
收不到重装）；还原 → **6 passed**。

**原样（原假设）**：WeakSet 在位时，真 re-provide `systemPrompt` / `tools` → 新服务里仍有
header/五段 section/`workflow_runs`；`delegation-control` 的 `list_subagents` / `send_to_subagent`
同样重装 → **6 passed**。

**`ctx.set` 读数**：`ctx.set('tools', 新服务)` 后，新 tools 的 `registered.size === 0`、旧 tools
仍有 `workflow_runs`——这是 vendor `set` 语义，不是本包安装丢失。

**全量**：`pnpm test` → **198 files / 1581 tests passed**；`pnpm typecheck` 绿；`pnpm lint` 0/0；
`pnpm verify` ALL PASS。

## 现行语义（canonical）

- vendor 合同：`vendor/dsh/vendor/cordis/src/registry.ts`（inject 的 unload/re-run）·
  `vendor/dsh/vendor/cordis/src/reflect.ts`（`set` 只覆盖值）
- 守卫：[inject-reentrancy.spec.ts](../../tests/host/index/inject-reentrancy.spec.ts)
- 代码：[delegation-contracts.ts](../../packages/company-pack/src/host/prompt/delegation-contracts.ts) ·
  [contracts.ts](../../packages/company-pack/src/host/prompt/contracts.ts) ·
  [workflow-runs.ts](../../packages/company-pack/src/host/delegation/workflow-runs.ts)
