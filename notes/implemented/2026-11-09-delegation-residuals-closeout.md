# 2026-11-09 · 委派面三条残差收口

状态：implemented（2026-11-09；P-H/P-I 确定性失败注入、worker-workflow no-go、host terminal 投影全部收口）

## 决定

1. **P-H/P-I**：以 tool-boundary fake-subagents 做确定性失败注入（`tests/host/delegation/subagent-retry.spec.ts` 6 条：error→success、error→error exhausted、refusal/aborted/max-tokens 不重试、非幂等、start 失败），并有真实 P-H 采用探针。真实 LLM 的“失败”不可确定性复现，不作为门禁；不声称真 LLM failure 已跑。
2. **worker-workflow**：no-go（见 [no-go Note](../archived/2026-11-09-worker-workflow-no-go.md)）；不从 planned 继续制造假希望。
3. **host terminal**：新增 host-only session projection `companyDelegationTerminal`（`turn/end.reason.kind`）；客户端 `delegation-tree` 优先读它，UI 显示 completed / failed / interrupted / aborted / max-tokens / refusal / lost（lost 仅当投影提供；workflow run 的 lost 不在 session tree）；缺失才回退 `subagentTiming`，再缺才 unavailable。
4. P-I：workflow 的 retry/missing 在脚本层，host 不自动重试（沿用 2026-11-09 决定）。

## 输掉的方案

- **真实 LLM 失败注入作为门禁**：失败类型/时机不可控，会把偶发当回归；fake-subagents 的边界注入已覆盖 tool 的分类逻辑，真实采用由 P-H 覆盖。
- **host remote 图**：为了几个终态标签引入新 remote/客户端数据面，成本高于 session projection；projection 是只读、可缓存、随 session 生命周期。
- **worker-workflow 强 persona**：多轮仍不稳定；no-go。

## 后果

- UI 的终态不再只靠 `subagentTiming` 的 boolean；host 投影给出精确 reason；无投影时如实 unavailable。
- `WORKER_PROFILES` 不再有 planned；worker family 三档 = worker / worker-researcher / worker-orchestrator。
- P-H/P-I 不再有待跑探针；真实 LLM failure 明确记为“不可确定性门禁”。

## 验证

- `pnpm test tests/presets`：73 passed；`pnpm test`：**1300 / 164 files**。
- `tests/host/delegation/delegation-terminal.spec.ts`：纯 fold/view + registration seam 2 条。
- `tests/client/data/delegation-tree.spec.ts`：host 投影 interrupted/aborted 断言；`delegation-flow-panel` 显示“中断”。
- `pnpm typecheck` 绿；`pnpm verify` **ALL PASS**；`pnpm lint` 0/0；`pnpm dup` 0 clones。
- `preset-smoke`：**6+3**；`ui-scene --isolated --refresh-golden` / `--golden`：**9 页签 ALL PASS**（头部改为“终态来自 host 投影；缺时不可见”）。
- 红形态：把 host 投影从 summary 移除 → tree 断言回到 subagentTiming/unavailable；把 worker-workflow 加回 planned → modelProblems/PRESET_IDS spec 红。

## 未验 / 边界

- `lost` 在 session tree 里只有在 host 投影显式给 `lost` 时显示；workflow run 的 lost 不在本面板（属 `workflow_runs` 的域）。
- 真实 LLM 的 failure 不跑；这是证据边界，不是缺口被隐藏。

## 相关

- [worker-workflow no-go](../archived/2026-11-09-worker-workflow-no-go.md)
- [退役 SA/SQA](./2026-11-09-retire-sa-sqa.md)
- [核心设计 Note](./2026-11-09-presets-delegation-model.md)
