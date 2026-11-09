---
status: 已修
severity: P1
opened: 2026-11-09
---

# BUG-050：BUG-045 的深度修复在真实装配下失效——CMO depth 2 仍能经 `subagent_retry` 起出 depth 3 worker

> 严重级别：P1（重要）｜发现：2026-11-09｜状态：已修（2026-11-09 复核：环境陈旧误报，非源码缺陷）
> 来源：2026-11-09 修复后真模型回归（R5）。前序 = [BUG-045](BUG-045-subagent-retry-depth-budget-bypass.md)（已修归档；本卡是同一行为的复发，按“已修不重开、复发新卡”处理）。
> 关联：[BUG-049](BUG-049-model-contract-retry-drift.md)（模型/注册面单源）。

## 复核（2026-11-09）：环境陈旧误报

初报的 R5 运行读取的是 `runtime/harness-home/profiles/company/node_modules/dsh-company-pack`
——一份 **13:58 的安装副本**，不是 `packages/company-pack` 当前源码。`startWeb --profile company`
加载该副本，所以只重建 `packages/company-pack/lib` 不会改变真入口行为；`pnpm verify`/`pnpm test`
走源码，因此全绿。这是**验证环境陈旧**，不是源码修复失效。

把 profile 指向当前源码后重跑：

```sh
node vendor/dsh/apps/cli/lib/bin.js plugin --profile company add link:/Users/bowhead/ai_dsh_company/packages/company-pack
```

R5 新会话结果：

- CEO `session-3d7ee4f5-a79e-46db-b7a7-464e387c1455`
- VP-Eng `9bd8e1c2-df00-4b79-abcf-5ca88238bd81`（depth 1）
- CMO `2fa5113b-4ef9-4931-8c12-8c7c6b3ff310`（depth 2）
- CMO 调 `subagent_retry` → `attempts: 0`、`childIds: []`、`stopReason: "depth-exceeded"`、
  `exhausted: true`；diagnostic 点名 `preset cmo ... depth 2 ... maxDepth 2`；没有 worker 会话
- CMO 最终回复：“retry 没有绕过深度上限，符合预期”

因此：**BUG-045 源码修复有效；本卡初报的 P1 是假阳性**。保留为负知识：真模型/真入口探针前必须确认
profile 安装 = 当前源码/构建（`pnpm company` 或 `plugin add link:`），不能只重建 `lib` 或只跑
`pnpm test`；否则会把旧副本行为当源码回归。

## 症状（初报，复核已否定）

初报时（profile 仍为旧副本）观察到：


修复提交 `8534546d`（retry 注册面/深度单源 + 越界可见拒绝）落地、pack 已重建后，真实链路仍然绕过深度预算：

- CEO `session-040dc02c-1d96-4cd8-895e-4ddd4d258547`
- VP-Eng child `bca7f3fe-a396-4477-b669-3019b4f859e1`（header depth 1 / preset vp-eng）
- CMO child `f2ea578f-87f3-426b-ba17-911f0a8f8797`（header depth 2 / preset cmo）
- CMO 调 `subagent_retry`：返回
  `attempts: 1`、`childIds: ["eb1d524c-…"]`、`stopReason: "completed"`、`exhausted: false`，
  **没有** `depth-exceeded`
- worker `eb1d524c-1f67-4553-96e4-32716c9304bc`：header `delegationDepth: 3`、`preset: worker`

CMO 自己的 system prompt 明确写着 `subagent` 2/2、remaining 0；它自己的最终回复也写：
“`subagent_retry` 未被 depth 门拦截，仍成功起了 worker。即：depth=2 处 `subagent` /
`subagent_fork` 已被禁止下沉，`subagent_retry` 不受该限制。”

## 根因（初报假设；复核已否定：实际是安装副本陈旧）

修复后的 `subagent-retry.ts` 在 `execute` 里这样取调用者：

```ts
const live = exec.agent as AgentLike
const caller = live.session === undefined ? agent : live
const callerDepth = depthOf(caller)
```

`depthOf` 读 `caller.session?.header?.delegationDepth` 与 `caller.options?.subagentDepth`。
关键假设：**真实装配里的 `exec.agent` 没有 `session`（或没有 header/options）**，于是回落到
**安装时的 agent**。而 host 工具在一个 agent 的 `tools` 作用域注册后，子代 CMO 看到的可能是
**VP-Eng 的实例**（preset `vp-eng`、预算 3），不是 CMO 自己的实例（预算 2）；或者回落的安装 agent
深度是 0。结果 `callerDepth` 被算成 1/0，`childDepth` 算成 2/1，`2 <= maxDepth(3)` 放行；
但 `startActivation` 的真实 parent 是 CMO（depth 2），child 实际落到 3。

这正好是 BUG-042 的教训重演：**keyless spec 用 fake agent 的 `session.header`/`options` 形状，
真实装配的 tool exec agent 形状不同**；`tests/host/delegation/subagent-retry.spec.ts` 全绿，
真实 CMO 的越界没有被拦。

另一个已确认的工程事实（不是本卡根因，但会放大误判）：修复提交后 `packages/company-pack/lib/`
是旧构建，第一次真跑仍用旧代码；重建后行为不变，所以不是单纯构建陈旧。

## 暴露的失败类

**“修复只对 fake 形状成立”**：深度检查读的是安装期/测试桩的字段，而不是引擎当前 agent 的
`delegationDepthOf`；per-agent 工具的实例归属（哪个 preset 注册的、哪个 agent 在调）在真实装配里
不等于测试假设。横切范围：所有 per-agent host 工具里读取 `exec.agent` 的深度/身份/组合的代码；
验证面必须有一条 **真实装配** 的越界回归，不能只有 fake spec。

## 复现

1. 重建 pack：`node ./node_modules/typescript/bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)`。
2. 起公司 web；CEO → `vp_eng`（depth 1）→ `vp_cmo`（depth 2）。
3. 让 CMO 调 `subagent_retry`（idempotent=true，短任务）。
4. 观察：返回 `attempts: 1` / childIds / completed，没有 `depth-exceeded`；worker header depth 3。

关键会话（本地 durable 日志，gitignored）：

- CEO：`session-040dc02c-1d96-4cd8-895e-4ddd4d258547`
- VP-Eng：`bca7f3fe-a396-4477-b669-3019b4f859e1`
- CMO：`f2ea578f-87f3-426b-ba17-911f0a8f8797`
- worker：`eb1d524c-1f67-4553-96e4-32716c9304bc`

证据摘要：`runtime/tmp/explore/round4/r4-2026-11-09T11-15-46-749Z/`（R5 运行；gitignored；
CMO 日志含 tool/call 与 tool/result）。

## 修复关联（初报清单；复核后未改源码，保留作排查参考）

- [`subagent-retry.ts`](../../../packages/company-pack/src/host/delegation/subagent-retry.ts) 的
  `depthOf` / `caller` 选取 / `maxDepth` 来源。
- 正确口径应优先用 vendor `delegationDepthOf(agent)` 或 `ctx.get('agents').get(exec.agent.id)`
  解析**当前调用者**；不能把 `exec.agent` 缺失字段时回落到安装 agent 当作真实深度。
- per-agent 注册：确认 CMO 的 `subagent_retry` 实例来自 `cmo`（预算 2），而不是从 VP-Eng 实例泄漏；
  如果 host tools 是全局注册，需要按调用者动态解析 preset/预算，而不是安装时闭包。
- 测试：`tests/host/delegation/subagent-retry.spec.ts` 增加“真实 exec agent 形状 / 无 session /
  有轮询 id”的用例；并在 `probes/team/` 或 `checks/smoke/` 加一条 CMO depth 2 的真模型/真装配回归。
- 与 BUG-045 的已修判定对照：当时只跑了 keyless；本卡的验收必须包含真实装配。

## 已修判定（复核后已满足）

> 复核结论：上述行为在 profile 指向当前源码后已实测满足；本卡不是源码缺陷，验收文本保留作防复发说明。


- 真实 `CEO→VP(1)→CMO(2)` 下，CMO 的 `subagent_retry` 返回 `attempts: 0`、
  `stopReason: "depth-exceeded"`、`childIds: []`、带 preset/预算诊断；不产生 depth 3 worker。
- vp-eng 长链仍放行：`CEO→VP(1)→workflow(2)→worker(3)` 与 VP root 的短 retry 不受影响。
- keyless spec 覆盖真实 exec agent 形状（或直接调用 `delegationDepthOf`），并有一条真装配回归；
  红形态 = 把 CMO 预算改回 3 或让 `callerDepth` 回落 0 时，真装配/纯 spec 至少一方红。
- 复查 per-agent 工具实例归属：CMO 看到的工具描述/预算属于 cmo，不是 vp-eng。
