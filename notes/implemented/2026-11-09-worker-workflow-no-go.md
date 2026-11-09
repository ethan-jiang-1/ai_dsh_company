# 2026-11-09 · worker-workflow 采用 no-go

状态：implemented（2026-11-09 决策；不发布 worker-workflow；从 model planned/文档/探针移除）

## 问题

worker family 的第三档 `worker-workflow` 想把 2–4 个独立核查分到 workflow 分支。结构上可挂载，但真模型采用不稳定：

- P-K 一次成功：child `1e3f5b79-0730-4537-9f4b-2266ae663d2d` preset=worker-workflow depth 1；两分支 `2bd5f650…`/`1468db0f…` depth 2；workflow 2 agents / `wf-ok`。
- 加强 persona（“必须先调用 workflow，不要用普通文本代替”）后，`e69b0f7d…` 仍有一次成功；但后续 `3eae329e…` / `29e2f0c8…` child preset 正确却未跑 workflow，probe transport/计时也出现过 fetch failed。
- 结论：这不是接线 bug；是模型不一定按 persona 使用 workflow。继续发布会给用户一个“看起来是 workflow 扇出、实际可能只回文本”的不可靠档。

## 决定

**no-go**：不发布 `worker-workflow`，不再作为 planned profile；从 `WORKER_PROFILES`、docs/policy/注释、P-K probe 中移除。worker family 保持 `worker` / `worker-researcher` / `worker-orchestrator`。

## 输掉的方案

- **继续强 persona 调优**：多轮验证仍不稳定；每次失败都要用户承担“看起来能并行、实际没并行”的风险。
- **把 worker-workflow 改成只有 workflow 一个工具**：模型仍可只输出文本；工具面收窄不等于行为保证。
- **保留 planned 留在模型**：会继续制造“待实现”的假希望和 todo 残留；用户已要求零残留。

## 后果

- 需要并行扇出的研发活仍由 vp-eng 的 `workflow` 通道承担；worker 层不承诺 workflow。
- `worker-workflow` 的原始 P-K 证据保留在历史 Note/归档；不再有活跃 probe/preset/model profile。
- `vp-eng` 的 generic child 仍只有 `worker` / `worker-orchestrator`。

## 验证

- `WORKER_PROFILES` 无 `worker-workflow`；`PRESET_IDS/SUPPORT` 无；worker-workflow probe 删除；checks/INDEX.generated.md 重新生成。
- `pnpm test tests/presets`：73 passed；`preset-smoke`：6+3；全量/typecheck/verify/lint/dup 绿（见收尾）。
- 红形态：若把 worker-workflow 加回 `WORKER_PROFILES` 但仍无 preset，`modelProblems`/`PRESET_IDS` spec 会红。

## 相关

- 原 worker family Note：[presets 委派面的模型化重构](./2026-11-09-presets-delegation-model.md)。
- 前序 specialist/worker 边界：[archived](../archived/2026-11-09-specialist-worker-taxonomy.md)。
