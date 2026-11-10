# 2026-11-10 · 能力面的执行承载：worker family 的 control 过滤 + fan-out 诚实声明

状态：implemented（2026-11-10 交付；上游 = [BUG-051](../../_backlog/_archive/fixed_bugs/BUG-051-worker-orchestrator-leaf-cap-contract.md) + [BUG-052](../../_backlog/_archive/fixed_bugs/BUG-052-worker-leaf-control-surface.md)）
> 同机制的上游决定：[presets 委派面的模型化重构](./2026-11-09-presets-delegation-model.md) §2（worker family / 小工头边界）；本 Note 修正其“1–2 个 leaf 住 persona”的软承诺，并把 worker family 的 control 面从 host 全局注册里拿掉。

## 问题

同一根因的两个方向——**声明面与执行面各说各话**：

- **052 漏声明**：`list_subagents` / `send_to_subagent` 由 `registerDelegationControl` 在 host
  全局注册。preset 的 worker leaf 注释与 policy 都写“没有 control”，但 host 工具不受 preset 行控制，
  于是 leaf 的模型可见目录里有这两个名字；sibling 发送被运行时按 parent ownership 拒绝
  （`belongs to another parent session`），不是越权，但模型会先浪费一轮去调。
- **051 过度承诺**：`worker-orchestrator` 的 description/persona 写“带 1–2 个 leaf”，运行面
  只有 `maxDepth`（层数），没有 child-count 闸；4 件 brief 实际起 4 个 leaf。设计 Note 明说
  1–2 只是 persona 的软约束，但 preset 对外描述把它写成了硬数字。

共同失败类：**capability surface 有两份事实**。上一轮修的是 depth/retry 的“单一声明源”，
这一轮是同一病长到工具可见面与 fan-out 上。

## 决定

1. **control 工具 per-agent 安装，worker family 不装**：
   `registerDelegationControl` 改成 `agent/created` 时在该 agent 的 `tools` scope 注册（与
   [`subagent-retry.ts`](../../packages/company-pack/src/host/delegation/subagent-retry.ts) 同模式）。
   `composedPresetOf(agent.ctx)` ∈ `WORKER_FAMILY_PRESETS` 就跳过；full role / CEO / 未知 preset 保留。
   worker-orchestrator 也在 family 内：它的 YAML 已声明“没有控制面”，收 leaf 结果靠 `subagent`
   的完成通知，不靠 `list_subagents`/`send_to_subagent`；父代理（VP/CEO）仍有 control 去续驶直接子代。
2. **fan-out 是父代理预算，不是 profile 硬承诺**：模型 `WORKER_PROFILES` 增
   `fanOut`——worker/researcher `{ policy: 'none' }`，orchestrator `{ policy: 'parent-brief', hardMax: null }`。
   `worker-orchestrator` 的 description/persona 去掉“1–2 个”，改成“按 brief 分配，件数与 fan-out
   预算由父代理决定”。没有 vendor per-tool child cap 之前不硬造闸。
3. **spec 钉三边**：`tests/presets/delegation-model.spec.ts` 钉 fanOut 策略；
   `tests/presets/delegation-composition.spec.ts` 读 YAML 的 description/persona，断言不再出现
   `1–2` 且写了“按 brief/父代理”；`tests/host/delegation/delegation-control.spec.ts` 按 preset
   断言 control 安装面。真实 4-task 探针保留为观察，不把 4 leaf 当故障。
4. **文档/技能/旧 Note 同 diff**：`docs/contracts/presets.md`、`docs/contracts/delegation.md`、delegation-policy §8、
   `eng-teaming` 第 2 档、`worker-orchestrator` 头注、旧模型 Note §2 全部改成同一口径。

## 输掉的方案

- **硬 fan-out 闸（host 计数/杀第 3 个 child）**：vendor 没有 per-tool child cap；要自己包
  `startActivation` 或在 `subagent/started` 后杀 child——事后杀给父代理的是“先成功再消失”，
  比诚实声明更糟，还等于在 host 里发明调度器。等上游有 cap 再做。
- **保留全局 control 工具，只改文案“可能可见”**：把“能力面是硬边界”降成建议；模型仍会浪费一轮，
  且 worker 的 preset 注释继续是假话。052 的根因就是全局注册绕过 preset，不修注册层等于没修。
- **只过滤 worker leaf，保留 researcher/orchestrator 的 control**：researcher 没有 child；
  orchestrator 的 YAML/设计都声明“没有控制面”。按 ID 挑一个固定，下一次加 profile 又漂——
  这正是 family 常量 `WORKER_FAMILY_PRESETS` 要避免的。
- **给 orchestrator 保留 control 以便续驶 leaf**：会与“worker family 无 control”的既有声明冲突；
  它收 leaf 结果走完成通知，确需续驶由父代理重新派。保留为**明确输掉**的备选，未来若出现
  “orchestrator 必须续驶 leaf”的真实需求再单独立卡。
- **新增 `controlTools` 模型字段**：family 常量已经存在且同时驱动 handbook；再加字段就是第二事实家。

## 后果

- worker family 的模型可见工具目录不再有 `list_subagents` / `send_to_subagent`；full role/CEO 不变；
  未知 preset 保持旧行为（安装），不因过滤漏掉根会话。
- fan-out 仍无硬上限：这是**有意**的（父代理负责 brief 的件数预算），但 preset 不再对外承诺数字；
  spec 会挡住“把 1–2 写回去”。
- 真装配探针前必须重建 **bundle**（`tsdown`），只跑 `tsc -b` 不会更新 `lib/index.js`——本轮第一次
  wave6 因此仍看到旧全局注册（见验证节）；这是 BUG-050“profile 旧副本”教训的同型延伸。

## 验证

**keyless（红→绿）**：

```sh
pnpm exec vitest run tests/host/delegation/delegation-control.spec.ts \
  tests/presets/delegation-model.spec.ts tests/presets/delegation-composition.spec.ts
# 绿：21 + 12 + 16 passed
```

- 052 红形态：把 install 的 family 过滤改成只跳 `worker` ⇒
  `worker family 不安装 control 工具` 红（`worker-researcher: expected [Array(2)] to deeply equal []`）；
  还原 ⇒ 21 passed。
- 051 红形态：把 `fanOut.hardMax` 改成 `2` 并把 description 写回“带 1–2 个 leaf” ⇒ 3 failed
  （模型 fanOut、modelProblems、composition 文案）；还原 ⇒ 12 + 16 passed。

**真装配（`runtime/rehearsal-workspace/exp/round4/`，gitignored）**：

- 052：`wave6-leaf-control`（VP root `session-5c5d6462-…`；alpha `d0b355c6-…` / beta `c822047b-…`）。
  alpha 的 `request/header` 工具目录 **21 个、`control present: []`**；alpha 回复“缺少工具，无法执行注入”，
  beta user message 2→2、injected=false。
- 051：`wave5-orchestrator-cap`（VP `session-bb793ff1-…`；orchestrator `2f0ca87e-…`）。
  4 件 brief → **leafCount 4**（depth 2 / worker），与“父代理 brief 决定”的诚实声明一致；
  不再把 4 当缺陷。
- 环境事实：第一次 wave6 在 `tsc -b` 后跑，仍看到 control（`lib/index.js` 是旧 bundle）；
  `packages/company-pack` 下 `tsdown` 重建 bundle 后复跑才得到上面的 21-tool 目录。
