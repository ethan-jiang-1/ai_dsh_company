---
status: 已修
severity: P2
opened: 2026-11-09
---

# BUG-051：worker-orchestrator 的“1–2 个 leaf”只是 persona——4 件 brief 下实际起 4 个 leaf

> 严重级别：P2（次要）｜发现：2026-11-09｜状态：已修（2026-11-10：修复就绪 → 修复已落地 → 已修）
> 来源：2026-11-09 修复后第五轮（W5-E）。关联：[worker family 设计 Note](../../../notes/implemented/2026-11-09-presets-delegation-model.md)、
> [worker-workflow no-go](../../../notes/archived/2026-11-09-worker-workflow-no-go.md)。
> 审查：agent — 对照「已修判定」逐条核过；真红→绿与真装配 4-task 观察见「修复落地」。

## 症状

VP-Eng root `session-95b708f6-e89f-4e0f-9ed1-2e2215f34e68` 起了一个
`worker-orchestrator`（`b694b3c5-27c1-45e1-9908-897dd18f9b15`，depth 1 / preset `worker-orchestrator`），
brief 要求“4 件独立读文件，各分给一个 leaf，自己汇总”。实际它起了 **4 个 leaf**：

| leaf | depth | preset |
|---|---:|---|
| `e2c42870-…` | 2 | worker |
| `ab22dcad-…` | 2 | worker |
| `709ed0b2-…` | 2 | worker |
| `624f10de-…` | 2 | worker |

而 preset 自己写的是：

- description：“内部执行手的小工头：**带 1–2 个 leaf worker**，只回证据与判断，不组队/不开 workflow”
- persona：“按 brief 把 **1–2 件**独立活分给 leaf worker，收齐证据后自己给结论”

设计 Note 也明确：小工头的“1–2 个 leaf / 不组队 / 不问用户”**住 persona**（软约束）。所以这不是引擎崩溃，
而是**preset 对外的 1–2 承诺与实际能力面不一致**：一个 4 件 brief 就能让它起 4 个 leaf，且没有
可见的拒绝/升级路径。

## 根因（假设）

`worker-orchestrator` 的 `tool-subagent` 行只有 `maxDepth: 3`（绝对深度），没有子代数量上限；
`WORKER_PROFILES['worker-orchestrator'].depthBudget: 1` 描述的是层数，不是 fan-out。1–2 只写在
persona/description 里，模型按 brief 的 4 件任务直接 spawn 4 次，没有任何硬闸或提醒。

这是“**软合同 vs 能力面**”的失败类，和“workflow 分支默认叶子”是 prose 同型：文案承诺一个上限，
工具面允许更大；不同点是这里 preset 的对外描述直接承诺了数字。

## 暴露的失败类

**“profile 描述承诺的 fan-out 没有被执行面承载”**。后果：
- 用户/父代理按“1–2 个 leaf”估算成本/并发，实际得到 4+；
- 小工头的“窄”边界只在模型愿意遵守时成立；brief 压力大时直接越界；
- 与 `worker-workflow` no-go 的“worker 不承诺并行扇出”口径有张力（4 leaf 已经是小扇出）。

横切范围：所有以 persona/description 写 fan-out 上限的 worker profile；如果以后再加
`worker.full` 或并行 profile，同一问题会复发。

## 复现

1. VP-Eng root 起一个 `worker-orchestrator`。
2. brief：4 件独立读文件（fixtures/a,b,c,d 的 version），每件分给一个 leaf，自己汇总。
3. 观察：orchestrator 起 4 个 leaf（headers 均为 depth 2 / preset worker），没有拒绝或升级。
4. 对照 [`worker-orchestrator/agent.cordis.yml`](../../../packages/company-pack/presets/worker-orchestrator/agent.cordis.yml)
   的 description/persona“1–2 个 leaf”。

关键会话（本地 durable 日志，gitignored）：

- VP-Eng root：`session-95b708f6-e89f-4e0f-9ed1-2e2215f34e68`
- orchestrator：`b694b3c5-27c1-45e1-9908-897dd18f9b15`
- leaves：`e2c42870-…` / `ab22dcad-…` / `709ed0b2-…` / `624f10de-…`

证据摘要：`runtime/rehearsal-workspace/exp/round4/r4-2026-11-09T14-56-13-172Z/wave5-orchestrator-cap/manual-summary.json`
（gitignored；含 root/orchestrator/4 leaf 的 header 与观察）。

## 修复关联

- [`worker-orchestrator/agent.cordis.yml`](../../../packages/company-pack/presets/worker-orchestrator/agent.cordis.yml)
  的 description/persona。
- `tool-subagent` 行本身没有 child-count 配置；若要做硬上限，需要 host 侧 wrapper / 计数闸，
  或等 vendor 提供 per-tool fan-out cap（不改 `vendor/dsh`）。
- 也可以选择**改文案**：把“1–2 个 leaf”改成“按 brief 分配，通常 1–2；超过由父代理决定”，
  并在 policy/skill 写清升级路径；但那就不能再把 1–2 当硬承诺。
- 测试：若加硬闸，spec 断言第 3 个 child 被拒绝/可见诊断；若只改文案，spec 断言 description/persona
  不再承诺硬数字，并保留真实 4-task 探针作为行为观察。
- 与 [BUG-050](BUG-050-retry-depth-fix-fails-in-real-assembly.md) 的教训一致：
  真模型探针要覆盖“模型按 brief 压能力面”的形状，不能只测 happy path。

## 已修判定

- 二选一，且写清选择：
  1. **硬上限**：`worker-orchestrator` 朝 4 件 brief 起第 3 个 leaf 时返回可见拒绝/升级提示，
     不起 child；keyless/真装配各一条；或
  2. **改承诺**：description/persona/policy 不再写“带 1–2 个”，改为“按 brief 分配，父代理负责
     fan-out 预算”，并有 spec 钉文案；真实 4-task 观察保留，不把 4 leaf 当故障。
- 无论哪条，都要有一条真实 4-task 探针记录实际 fan-out，避免“文案改了、行为没测”。

## 修复落地（2026-11-10，选 2 = 改承诺）

- **模型**：[`delegation-model.mjs`](../../../tools/lib/delegation-model.mjs) 的 `WORKER_PROFILES`
  增 `fanOut`：worker/researcher `{ policy: 'none' }`，orchestrator
  `{ policy: 'parent-brief', hardMax: null }`；`modelProblems()` 拒绝 `parent-brief` 带数字。
- **文案**：worker-orchestrator 的 description/persona/头注去掉“1–2 个”，改为“按 brief 分配，
  件数与 fan-out 预算由父代理决定”；不发明 child-count 硬闸（vendor 无 per-tool cap）。
- **spec**：`delegation-model.spec.ts` 钉 fanOut 策略；`delegation-composition.spec.ts` 读
  description/persona，断言不再出现 `1–2` 且写了“按 brief/父代理”。
- **文档/技能**：`docs/contracts/presets.md`、`docs/contracts/delegation.md`、delegation-policy §8、`eng-teaming`
  第 2 档、旧模型 Note §2 同口径。
- **真红→绿**：`fanOut.hardMax` 改成 2 + description 写回“1–2” ⇒ 3 failed；还原 ⇒ 28 passed。
- **真装配 4-task 观察**：`wave5-orchestrator-cap`（VP `session-bb793ff1-…`、orchestrator
  `2f0ca87e-…`）仍起 **4 个 leaf**（depth 2 / worker），符合“父代理 brief 决定”的诚实声明；
  不再把 4 当故障。
- **全量**：`pnpm verify` / `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm dup` 绿（同提交）。
- 决定与输掉的方案 = [capability surface Note](../../../notes/implemented/2026-11-10-capability-surface-enforcement.md)。
