---
status: 已结
opened: 2026-11-13
---

# 推敲：测试资产围栏 P0——修两条红资产、退役惰性审计、加快档 lane

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：implementation — 修 `two-axis-gates-smoke` / `replay` 新鲜度 / `candidate-scan-eval` 状态；新增 `smoke:fast`（6 条稳定 keyless）；Note = [2026-11-13-test-asset-fence](../../../notes/implemented/2026-11-13-test-asset-fence.md)。
>
> **审查**：agent — 语义审通过；pre-push 全链 exit 0（verify ALL PASS、smoke:fast 6 条 2.78s、test 242/1997）；落地证据齐。
>
> **授权边界**：用户 2026-11-13「弄个 issue 出来吧，然后我们推动落地」；只动测试资产 + 必要的 docs/package/hook 脚本，不动产品代码与 vendor。

## 问题与期望结果

**触发**：用户 2026-11-13 要求复核测试资产围栏，目标是「尽量用单元/集成快资产，避免端到端慢资产」。研究（[test-asset-fence](../../research/test-asset-fence/README.md)）实测：8 个便宜 keyless 环外资产里 2 红 1 惰性；`pnpm test` 242 files / 1997 tests / 26.0s；pre-push 全链 ~41s。

**期望结果**：P0 完成后——
1. `two-axis-gates-smoke` 的负例 mutation 不再空转，四个判据全绿；
2. `replay` 的 `runnable` 声明与实测一致（`--refresh` 后绿；刷不动则 `archived`）；
3. `candidate-scan-eval` 不再以 exit 2 冒充「常驻」；
4. `pnpm smoke:fast` 串行跑 6 条稳定 keyless（~2.4s），进 pre-push。

## 当前情况

- 立卡时 `two-axis-gates-smoke` 2/5 失败。品类表已英文化（`SKILL.md:36` 为 `| Hardware-software product |`），smoke 仍替换 `| 硬软一体产品 |`；meta 已 canonical 为 `deliveryMode:`（`templates/meta.md:22`），smoke 仍删 `^交付模式:`。两处 mutation 都是 no-op。
- 立卡时 `replay-smoke` 1 项失败（归一化日志零 diff）；headless 场景 fixture 含技能目录，技能一改就漂移；`replay-scene-liveness` 按设计不证明 `runnable` 真绿。
- 立卡时 `candidate-scan-eval`：`snapshots/corpora` 不存在，exit 2；头注状态仍「常驻」（本轮已改 `已耗`）。
- 第二遍复核已验证修正后的两条 mutation 会让对应 gate 报出预期红（临时副本，未改树）。

## 未决问题

1. `replay --refresh` 能否在当前 HEAD 复绿；不能则按 U2 的 `archived` 分支落。
2. `smoke:fast` 放 pre-push 后是否稳定（若与本次改动无关地 flake，按反证条件移出该条）。
3. 预算注释（`.githooks/pre-push` / `ci.yml` 的 1.3s 旧读数）是否同轮更新——本卡按「是」处理，属 A1 的附带 docs 修正。

## 方案与取舍

**做（P0）**：

- **U1**：`two-axis-gates-smoke` 的 mutation 改用现行 canonical 文本；加「mutation 必须改到字节」断言；共享助手放 `checks/lanes/lib/`，`gates-negative-smoke` 同用。
- **U2**：先 `node checks/lanes/replay.e2e.mjs --refresh`（headless authored、无 key；workspace oracle 失败会拒绝），复跑确认绿并更新 `snapshot.yml` 资格日期；刷不动则 `replayEligible: archived` + 日期理由。
- **U3**：`candidate-scan-eval` 状态改 `已耗（2026-11-13 语料已移出本仓；恢复语料时重跑）`。
- **A1**：新增 `新建:checks/lanes/fast-lane.mjs` + `package.json` 的 `smoke:fast`；第一版 6 条：`workflow-contract` / `present-catalog` / `company-root-process` / `gates-negative` / `snapshot-motion` / `two-axis`；进 `.githooks/pre-push`。
- 同轮更新 pre-push/CI 的预算注释为实测值。

**不做**：A2（`export-dist` 抽 plan，仅复发时）、A3（headless 静态新鲜度，`--refresh` 再漂才做）、A4（负例扩面，另卡）、A5（probe 审计，另卡）；不动产品代码/vendor。

**输掉的方案**：把慢资产拉回 `pnpm test`（违反 layering 围栏）；把 `replay` 放进每 push 的 lane（3.9s 且易漂，先独立）；给所有 32 个 smoke 手写「最后实跑」（lane 自动覆盖 6 条，其余按需）。

## 事实与读者

- 事实（新增/修改）：测试资产的**新鲜度回路**——mutation 必须真改字节、重放 fixture 有刷新/归档路径、惰性资产有状态、便宜资产有 lane。
- 唯一入口：本卡（P0 范围）+ [研究题名页](../../research/test-asset-fence/README.md)（证据与取舍）。
- 读载体 / 写载体：`checks/lanes/*`、`checks/lanes/lib/`、`snapshots/replay/`、`checks/audit/`、`package.json`、`.githooks/pre-push`、`tests/README.md`；维护者与 pre-push 使用者是读者。
- 环境坏法：内容（i18n/canonical 迁移让 mutation 空转）、生命周期（fixture 资格过期）、来源（CI 不构建 vendor，cheap smoke 跑不动）；根/叶路径不是本条的主轴。

## 关闭条件

P0 的 `## 验收标准` 全绿；`## 落地证据` 用实跑结果替换「实施后填」；研究题名页标 `已定性` 并回链本卡；同轮 Note 落 `notes/implemented/`；不新增 E2E、不动产品代码。

## 落地证据（`去向=note|implementation` 必填）

- 改了哪些系统面（路径）：`tests/checks/two-axis-gates.test.mjs`、`tests/checks/gates-negative.test.mjs`、`checks/lanes/lib/mutation.mjs`、`checks/lanes/fast-lane.mjs`、`snapshots/replay/foundation-workspace/`（raw/session/snapshot.yml）、`checks/audit/candidate-scan-eval.mjs`、`package.json`、`.githooks/pre-push`、`.github/workflows/ci.yml`、`tests/README.md`、`checks/README.md`、`docs/testing.md`、`notes/implemented/2026-11-13-test-asset-fence.md`。
- 实跑命令与结果：`node tests/checks/two-axis-gates.test.mjs` ALL PASS（5/5）；`node tests/checks/gates-negative.test.mjs` ALL PASS（5/5）；`node checks/lanes/replay.e2e.mjs --refresh` exit 0，复跑 ALL PASS（2s）；`pnpm smoke:fast` ALL PASS（6 条，1.92s 单跑 / 2.2–2.8s pre-push）；`pnpm verify` ALL PASS；`sh .githooks/pre-push </dev/null` exit 0（test 242 files / 1997 tests，29–35s，两次）。

## 抽象度

- 换公司要改吗？→ 不会；这是仓库测试资产，不是公司内容。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 会；若换测试载体/CI 形状，lane 与 fixture 规则跟着换，但「mutation 必须真改字节 + 慢资产有新鲜度」不变。
- 只有机制本身变才改吗？→ 是。
- 第二消费者：后续加 smoke/fixture 的维护者、pre-push 使用者。
- 搬家成本：低；规则住 `checks/lanes/` 与 `tests/README.md`，不新建索引。

## 验收标准

| 命令 | 断言 | 红形态 |
|---|---|---|
| `node tests/checks/two-axis-gates.test.mjs` | ALL PASS（2 真副本 + 3 负例；mutation 断言在场） | 把任一 canonical mutation 改回旧字符串/删掉断言 → 红 |
| `node checks/lanes/replay.e2e.mjs` | ALL PASS；`snapshot.yml` 的 `runnable` 与实测一致（或 `archived` + 日期理由） | 不刷新直接跑 → 归一化日志零 diff 红 |
| `pnpm smoke:fast` | ALL PASS；6 条、~2.4s、串行 | 从 `fast.mjs` 删一条或改坏其命令 → 红 |
| `pnpm verify` | ALL PASS | 任一结构门禁红 |
| `pnpm test` | 242+ files / 1997+ tests passed；≤30s | 任一 spec 红或超预算 |
| `node checks/audit/candidate-scan-eval.mjs` 头注 | 状态 = `已耗（2026-11-13 …）`；`script-status` 绿 | 保留「常驻」→ 语义不一致（人审） |
