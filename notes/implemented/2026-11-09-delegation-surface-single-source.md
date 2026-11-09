# 2026-11-09 · 委派能力的声明面收口：retry 注册面/深度单源 + 合同载体状态

状态：implemented（2026-11-09 交付；上游 = [BUG-049](../../_backlog/_archive/fixed_bugs/BUG-049-model-contract-retry-drift.md) + [BUG-045](../../_backlog/_archive/fixed_bugs/BUG-045-subagent-retry-depth-budget-bypass.md)；模型重构的同一根因：期望源不覆盖后加能力面）
> 同机制的上游决定：[presets 委派面的模型化重构](./2026-11-09-presets-delegation-model.md) §8/§9。
> 本 Note 补全其 retry 注册面/深度事实（原 §8 只写 `runtimeTool`、深度另算；§9 的深度面只讲
> `subagent` 行）；旧 Note 已就地更新事实落点并在头部回链，决定正文未改。

## 问题

2026-11-09 委派面重构后，`subagent_retry` 是 P4 新加的 host 原语：注册列表写在
[`src/index.ts`](../../packages/company-pack/src/index.ts)、深度默认值写在
[`subagent-retry.ts`](../../packages/company-pack/src/host/delegation/subagent-retry.ts)（`DEFAULT_MAX_DEPTH = 3`），
两者都不在“唯一期望源” [`delegation-model.mjs`](../../tools/lib/delegation-model.mjs) 里。后果有两层：

1. **预算分裂**：一个 `delegationDepth: 2` 的 CMO 用普通 `subagent` 会被行级 `maxDepth: 2` 拒绝，
   换 `subagent_retry` 就能起 `depth: 3` 的 worker——深度预算变成“看用哪条工具”。
2. **静态漂移**：模型自称唯一期望源，但合同 `status` 仍是 `planned`（policy skill / workflow section
   已落），retry 的注册面/深度也不在模型；`tests/presets` 全绿却查不到这两类漂移。

同一轮还确认：`engine.subagent` 没有独立 prompt section，规则并入了 policy skill 与工具描述；这一点
此前没有写清，模型里只能靠 `status: planned` 含糊带过。

## 决定

1. **合同载体状态只描述现实**：`CONTRACTS.*.status` 用三个词——`delivered`（载体已随包发布，
   必须有真实 `carrierPath`）、`merged`（无独立载体，规则并入 `mergedInto` 指向的合同）、
   `planned`（载体未落；随包里不应出现）。`policy.delegation` / `engine.workflow` = `delivered`，
   `engine.subagent` = `merged` → `policy.delegation`。`modelProblems()` 与
   `tests/presets/delegation-model.spec.ts` 同时校验：状态词合法、`delivered` 的 `carrierPath` 文件存在、
   `merged` 的 `mergedInto` 能解析。
2. **retry 深度不另立预算**：`retrySurface()` 从 `COMPOSITIONS.*.depthRows.subagent` 派生——
   注册面 = **full role 且有通用 `subagent` 行**（CEO 是 lead、worker family 是执行手，都不挂）；
   深度 = 那一行的 `maxDepth`（vp-eng 3 / vp-sales、coo、cfo、cmo 2）。
3. **运行时唯一表**：pack 的 `SUBAGENT_RETRY_SURFACE`
   （[`retry-policy.ts`](../../packages/company-pack/src/lib/retry-policy.ts)）是 host 唯一注册来源，
   `src/index.ts` 不再写第二份 preset 列表；`tests/presets/delegation-retry.spec.ts` 钉三边一致：
   运行时表 == 模型 `retrySurface()` == 各 preset YAML 通用 `subagent` 行的 `maxDepth`。
4. **越界是可见拒绝，不是静默起 child**：`subagent_retry` 在调用前按
   `max(header.delegationDepth, options.subagentDepth) + 1` 与调用者 preset 预算比较（与 vendor
   `delegationDepthOf` 同口径）；越界返回 `attempts: 0` / `childIds: []` /
   `stopReason: depth-exceeded`（模型 `RETRY.subagent.depthDenial` 与 pack 同源）/ `exhausted: true` + 点名 preset 与预算的 `diagnostic`，不调
   `startActivation`。预算内仍把该预算作为 `maxDepth` 传给引擎，作为第二道闸。

## 输掉的方案

- **保留全局 `DEFAULT_MAX_DEPTH = 3`，只加注释/诊断**：仍然让 CMO 起出 depth 3 child；
  “被发现才修”的预算分裂还在，且模型继续不知道 retry 的深度面。
- **给 `subagent_retry` 另建一份 per-preset 深度表（模型 + host 各一份）**：数字会有第三份家，
  与 `depthRows` 漂移只是时间问题；这正是 BUG-049 的失败类。
- **改 `vendor/dsh` 的 `startActivation`，让它从 preset 行读预算**：vendor 只读铁律；且这是本仓
  组合语义，不是引擎语义。上游提案留给真正需要通用化的时候。
- **在 `src/index.ts` 继续硬编码 allowedPresets，只加 spec 反查**：反查能抓漂移，但运行时事实仍
  有两份；直接让 index 消费 surface 才是单源。
- **给 `subagent_retry` 只做“引擎抛错后捕获”**：能拦住 child 起来，但模型拿到的是泛化的
  `error`，会被读成“可重试”；且会浪费一次 activation 预留。预算检查放在调用前。

## 后果

- `subagent_retry` 的失败分类（completed/error/refusal/aborted/max-tokens/非幂等/start 失败）不变；
  新增的 `depth-exceeded` 是**调用前拒绝**，不进入 `RETRY.noRetry` 的 terminal 分类。
- vp-eng 长链仍放行：vp-eng 在 depth 2 调用 retry，child = depth 3 ≤ 预算 3。
- 新增能力面时的流程：先改 `COMPOSITIONS`/`RETRY`，再改 pack 的 surface，最后 spec 会同时钉
  YAML、模型与 host；不再靠人记得改三处。
- `SUBAGENT_RETRY_SURFACE` 的深度数字仍是 pack 内的一份（发布面不能 import `tools/lib`），
  但它是**被 parity spec 钉住的运行时表**，不是第二期望源。

## 验证

真跑过的命令与红/绿形态（2026-11-09，工作树在修复提交前）：

```sh
pnpm exec vitest run tests/presets/delegation-model.spec.ts \
  tests/presets/delegation-retry.spec.ts tests/host/delegation/subagent-retry.spec.ts
# 绿：3 files / 32 tests passed
```

**红形态 A（预算分裂回归）**：把 `SUBAGENT_RETRY_SURFACE.presets.cmo` 从 `2` 改回 `3`，跑
`tests/presets/delegation-retry.spec.ts` + `tests/host/delegation/subagent-retry.spec.ts` → **4 failed**：
parity 两条（`expected ... to deeply equal ...`、`cmo: expected 2 to be 3`）+ host 两条
（“CMO 在 depth 2 拒绝”与“运行时 subagentDepth 取大”各 `expected [...] to have a length of 0 but got 1`）。
还原后同命令 **22 passed**。

**红形态 B（载体状态漂移）**：把 `policy.delegation.status` 从 `delivered` 改回 `planned`，跑
`tests/presets/delegation-model.spec.ts` → **1 failed**：
`合同载体状态与真实载体一致：已落载体不得再标 planned（BUG-049）`（`expected 'planned' to be 'delivered'`）。
还原后 **10 passed**。

结构门禁与全量回归在同提交的收口阶段跑（结果见提交与卡）：`pnpm verify`、`pnpm test`、
`pnpm typecheck`；`vendor/dsh` 零改动。

**真模型/真装配回归（2026-11-09 晚）**：把 dev profile 指向当前源码（`plugin add link:`）后，
`CEO→VP(1)→CMO(2)` 的 CMO 调 `subagent_retry` 返回 `attempts: 0` / `stopReason: depth-exceeded` /
`childIds: []`，无 worker；vp-eng root 的正样本仍 `attempts: 1` / completed。首次“修复失效”是
profile 旧安装副本导致的假阳性（BUG-050 误报），已归档；证据见
[研究材料 §9.6](../../_backlog/research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md)。
