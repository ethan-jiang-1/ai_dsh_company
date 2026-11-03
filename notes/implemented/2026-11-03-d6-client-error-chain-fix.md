# 2026-11-03 · D6：页面错误 → host 日志的断链（rawInput 前导空白）

状态：implemented（2026-11-03；七维复评 Phase 3 D6）

> 上游 = 2026-11-03 fresh 复评 D6「页面→host log 全链路未端到端」。
> 关联 = [Phase 0](./2026-11-03-release-truth-phase0.md)。

## 病与根因

- 真页面探针（Playwright + 真 web）复现：打开会话后 `console.error(marker)` 进入错误环
  （`window.__DSH_COMPANY_ERRORS__` 两条），但 `$DSH_HOME/logs/company-client-errors.log` 不出现。
- 客户端 reporter 确实调了 `remote.commands.execute(current.id, '/company-diagnostics client-error …', [])`
  （debug 读数：`injected → call → current=session-…`）。
- 根因在 host 命令：vendor `parseCommand`（`packages/interaction/commands/src/index.ts:125`）的
  `rawInput = line.slice(match[0].length)`，而 `match[0]` 不含命令名后的分隔空白 ⇒ handler 拿到的是
  `" client-error …"`（前导空格）。`registerClientDiagnostics` 用 `rawInput.startsWith('client-error ')`
  判断，永远 false，返回用法错误。
- 既有单测 `host-composition.spec` 直接调 `handler({ rawInput: 'client-error …' })`（无前导空格），所以
  一直绿——**测试形状与真实 dispatch 形状不一致**，这正是假绿。

## 修复

- `src/host/client-diagnostics.ts`：`const input = rawInput.trimStart()`，后续判断/切片都用 `input`；
  注释写明 vendor 形状与 2026-11-03 真页面断链。
- `tests/company/host-composition.spec.ts`：handler 调用改成 **真实 dispatch 形状**
  （`` rawInput: ` client-error ${payload}` ``），并注明为什么前导空白必须覆盖。四条同类调用全部改。
- 不 trim 客户端 line：命令 handler 的契约就是接收 dispatch 后的 rawInput；客户端已按 `/命令 参数` 发。

## 验证（实跑，2026-11-03 09:5x +08）

```text
# 修前（RPC 直接打真实 dispatch 形状）
commands/execute line='/company-diagnostics client-error …'
→ {kind:"error", text:"用法：/company-diagnostics client-error <URI-encoded JSON>"}

# 修后
commands/execute 同一行
→ {kind:"success", text:"已记录客户端错误（logs/company-client-errors.log）。"}
→ $DSH_HOME/logs/company-client-errors.log 出现该 marker

# 真页面（dev home）
错误环捕获 1 条；reporter injected → call → current=session-…；
commands/execute 返回 session/writer-held（dev home 另有 writer 持有该会话）——**不是本修复回归**，
是 dev 多实例的现场。

# 真页面（isolated 单 writer；2026-11-03 补）
node checks/smoke/client-error-chain-smoke.mjs
# ALL PASS：会话打开（单 writer）→ 错误环捕获 → host 日志落盘
npx vitest run tests/company/host-composition.spec.ts   # 8 passed
pnpm test                                                # 135 files / 1084 tests
pnpm verify                                              # ALL PASS
```

## 余项

- reporter 在 `session/writer-held` 时只有一次性 `console.warn`；是否要在 UI 上更显眼，另行评估。
- isolated smoke 已覆盖整链；dev home 的 writer-held 是环境现场，不是链路缺陷。
