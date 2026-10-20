---
status: 已修
severity: P1
opened: 2026-10-20
---

# BUG-030：diagnose 审批判读字段错位——读想象键读不到真日志的 outcome，每条审批都失真

> 严重级别：P1（重要）｜发现：2026-10-20（六维度第二轮审计，D6 通路盘点）｜状态：已修（2026-10-20，用户授权 P0 批次）

## 症状

`pnpm diagnose --session <slug>/1d120f37`（真 CEO 动议会话，含一条 rejected 审批）输出：

```text
FAILURES
  - approval ? →
```

无名、无结论、无 outcome——审批维度整列不可读。

## 事实与根因

- 真 v4 日志形状（vendor `docs/persistence-catalog.md`「approval/decided」权威）：
  `approval/decided.data = {id, outcome}`，`outcome ∈ allowed-once | rejected | cancelled | unavailable`；
  工具名在同 id 的 `approval/asked.data.toolName`（`reason` 也在 asked 侧）。
- `tools/lib/session-diagnose.mjs` 的 `decisionOf` 读的是 `decision?.kind / decision / answer / approval?.decision`——
  与真实键完全不相交 ⇒ 每条审批：allowed-once 被误报失败、真 rejected 丢结论、工具名永远空。
- **夹具漂移**：`tests/harness/session-diagnose.spec.ts` 用想象形状 `{toolName, decision}` ⇒ 76 spec 全绿，
  工具读真日志必错。该工具 2026-10-20 早晨才生（consistency sweep 批次 2），出生当天即带此雷。
- 附带同修：`turn/end` 的 `reason.error` 为对象时 `String()` 渲染成 `[object Object]`（同会话实测：
  `{"message":"DeepSeek Messages stream: tool input is invalid JSON","code":"MALFORMED_RESPONSE"}` 曾被折成
  一行 [object Object]）。

## 修复（红→还原→绿）

- `decisionOf` 读 `data.outcome`；`isAllowedDecision` 收敛为 vendor 枚举的 `allowed-once`（其余入失败，fail-closed）。
- asked/decided 按 `id` 配对拿 `toolName`（append-only 保证 asked 先行；缺席时如实为空，不猜）。
- 新增 `detailOf`：对象 JSON 序列化，turn/end 与 tool/result 两条错误路径共用。
- spec 夹具全部改真 v4 形状（asked+decided 配对 / 枚举四态 / 对象 error / 孤儿 decided）。
- 红相（修前实测）：`session-diagnose.spec` 4 failed（配对/枚举/孤儿/序列化断言）；
  绿相：27/27；活体：同会话 diagnose 现出 `approval request_signoff → rejected`（asked 侧 reason「毛利<30% 双签」可对勘）。

## 教训

**夹具用想象形状 = 绿灯保释错实现**——「套件全绿」与「工具读真日志正确」之间隔着一层从未对过的形状。
新工具的判据夹具应从真日志取样（本卡修复即以 session-1d120f37 原行为样）。
