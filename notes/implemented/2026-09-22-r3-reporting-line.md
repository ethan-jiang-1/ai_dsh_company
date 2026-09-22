# 2026-09-22 · R3 轮次收尾（汇报线：命名委托 + 委派卡 + 一条被实证推翻的设计）

## 本轮交付（外部可观察）

- **CEO 汇报线两条路**：多职能协作走 `spawn_teammate`（team，主通道）；单职能快捷出稿走
  **命名委托工具** `vp_eng` / `vp_sales`（通道 A，one-shot 前台 + per-instance persona +
  `maxDepth: 1`）。语义合同出生：`docs/delegation.md`。
- **委派工具卡**：pack 的 client 面新增 `tool.call.toolview` keyed 槽（key = `vp_eng`/`vp_sales`），
  把一次委派渲染成"委派 · VP-Eng｜brief｜VP 交回的稿子"。
- **一条被推翻的原设计（本轮最重要的产出）**：原计划命名委托用 `continuable` + `send_message`
  追加意见。**实证否掉**——CEO 会话从第一帧起就是 team-scoped，三个控制名全被团队版 shadow，
  而团队版按**成员名字**寻址，subagent child 不在名册上。详见下节。

## 被推翻的设计与证据（三层，都不依赖模型自述）

| 层 | 证据 |
|---|---|
| 归档（R2 即已如此） | `snapshots/r2-motion/sessions/lead.jsonl` 的**第一帧** `request/header` 里，`send_message` 描述已是团队版（"another **Team member**"） |
| 工具 schema | 团队版 `send_message` 参数 `target` = "Team member **name**, or lead"；`list_agents` 无参数；`interrupt_agent` `target` = "Teammate name"。全局版对照：`agent_id` = "any exact live Agent may target its **direct continuable child**" |
| 服务实现 | `agentTeams.sendMessage(caller, { target: <name> })` 走 roster 成员解析（vendor `packages/experimental/agent-team/src/index.ts:163`），非成员不在 roster；`maybeInstall` 明确跳过非成员 |

**推论**：`continuable` 的续驶前提（能 `send_message`/`interrupt_agent`/`list_agents`）在 CEO 会话里
不成立 ⇒ 改 `one-shot` + `enableRunInBackground: false`（后者另堵一个坑：后台 one-shot 要靠
`job_output` 收，而 CEO 的模型可见目录里没有它）。**连续对话归 team**（Q1 由此闭合，台账 D18）。

## 实际跑过的验证（本轮门禁）

| 检查 | 结果 |
|---|---|
| `pnpm verify` | ALL PASS（含 vendor 铁律 SHA + 零改动；`preset-dep` 修了 subpath 归一） |
| `pnpm test` | **19/19，2.1s**（新增：CEO 汇报线配置守卫 + 卡片 keyless 行为 7 条 + client 面 key↔toolName 2 条） |
| `node scripts/preset-smoke.mjs` | 五角色 ALL PASS（重装 pack 后） |
| `node scripts/client-load-smoke.mjs` | ALL PASS（真浏览器零 loader 错误 + 品牌在场） |
| `node scripts/delegation-smoke.mjs --delegate` | ALL PASS（1+1 条 prompt：目录里 `vp_eng`/`vp_sales` 在场；三控制名归团队版；**真委派前台返回 child 正文**） |
| `node scripts/handbook-smoke.mjs` | ALL PASS（首跑**红**：`session/page` 的 `throughSeq: -1` 静默返回 0 条 → 误判"基线没注入"；修真后绿） |

**反证**：`tests/presets.spec.ts` 的汇报线守卫——临时抽掉 preset 里的委托工具/控制行即变红，
还原即绿（实测过）。

## 立的新纪律（guides/60 §9.1，来自用户当轮反馈）

用户指出："这种测试如果是 regression 的话，跑得这样慢是完全受不了的。" 复盘：**层次放错了**——
把"真浏览器 + 真模型 + 真 UI"当回归门禁（240s 都等不到，且依赖模型配合）。落成三条硬规矩：

1. **真模型 / 真浏览器不进迭代环**：迭代环只跑 `verify` + `test`（秒级）。
2. **能做成纯函数就做成纯函数**：UI 组件的"展示事实"抽成纯函数（范本 `delegationCardModel`），
   keyless 单测直接断言——组件层从此不需要模型与浏览器。
3. **认证档要能"重放"而不是"重跑"**：真模型跑一次 → 归档 → 后续用归档断言（R5 replay harness）。

**被否决的具体做法**（别再重走）：① "真浏览器驱动 composer 让模型自己调工具"——CEO persona 的
开工仪式先烧 5–6 步模型往返，且模型不调工具就永远绿不了；② "RPC 造证据 + 真浏览器只做渲染断言"——
卡在侧栏**会话列表成员/排序**（RPC 建的会话不在侧栏可见行里，属无关的 UI 细节）。
委派卡的端到端（模型→工具→卡片）**留给 R5 replay harness**；当前由 keyless 行为层 +
真页面挂载冒烟覆盖。

## 环境状态（下轮判断"什么已就绪"只读这里）

- `DSH_HOME=dev/harness-home`；pack `dsh-company-pack@0.2.0` 已装进 web profile（本轮多次
  `plugin remove + add` 刷新）；client 面已构建（`lib/client.js` 含委派卡）。
- 回归资产新增 **`snapshots/r3-delegation/`**（探针场景：模型可见目录 + 一次真委派的 one-shot 证据，
  lead 35 行，无工作区期望态）。归档脚本 `scripts/snapshot-motion.mjs` 新增
  `--scenario` / `--no-workspace` 两个开关。
- 新增共享库：`scripts/lib/session-log.mjs`（`session/page` 两步读法的唯一实现）、
  `scripts/lib/playwright.mjs`（chromium 定位；`client-load-smoke` 已改用它）。
- 模型凭据在开发 home；真实会话可用。

## 未做 / 移出本轮

- **委派卡的端到端真 UI 验证** → R5 replay harness（理由见上）。
- **CEO preset 的 `subagent` 行仍是 `continuable`**（同一 footgun：VP 根会话没有控制行 ⇒ 那些
  child 也管不了）。**不在 R3 顺手改**（会动到 teammate 的 worker 行为）；记入 `delegation.md` §4.4。
- **并行快捷派活**（同时开几个 VP）在本组合无干净解法 → 等上游 seam（per-child composition /
  不撞名的控制面），本仓不自建（D13）。
- R2 遗留：**两空间镜头的完整人眼观演**（随 R5 的"进入成员空间"入口一起做）。
