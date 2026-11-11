---
topic: DSH 原生编排基线：原语阶梯、四通道能力面与合同分层
intent: 把外部研究树 _digested/delegation-and-orchestration 的承重结论压成可对照的基线，并用 vendor 源码核对关键断言；只做阅读摘录，不评价本仓
---

# DSH 原生编排基线

> 读法：§1 原语阶梯；§2 四通道能力面；§3 选择政策与合同分层；§4 深度与容量；§5 观测与证据；§6 对照本仓时的五个问题。
> 来源：外部研究树 `_digested/delegation-and-orchestration/`（只读）与 `vendor/dsh` 钉住源码（tag `dsh-v0.2.1-rc.5`）。**机制权威在 vendor，研究树只是阅读路线**；本页不引入新机制。

## 0. 一句话

DSH 没有中心调度器。它给一组可组合原语（todo / plan / subagent / fork / workflow / goal / jobs / schedule / team），**策略随工具走**，模型按任务的时间跨度与隔离需求自己选；引擎只保证归属、持久化、深度与终态，不保证“选得对”。外部叙事的“Captain 规划 + Kahn 入度队列 + Reviewer 门禁”不是当前源码的形状。

> 依据：`00-map.md`「一句话」与「六条不变量」；`design-perspectives/03` 的 master convention 原文（`packages/workflow/tool-workflow/src/index.ts:324`-`325`）。

## 1. 原语阶梯

| 原语 | 谁持循环 | 记忆在哪 | 结果何时可见 | 完成证据 |
|---|---|---|---|---|
| 自己做 | 当前 Agent | 当前会话 | 每步 | 自己的判断 |
| `todo_write` / plan mode | 当前 Agent | 当前会话 | 每步 / 计划批准 | 清单 / 批准 |
| `subagent` / `subagent_fork` | child | child 自己的会话 | 结算通知 | child 收尾消息（自报） |
| `workflow` | 模型写的 JS 脚本 | 脚本变量 + 各 child 会话 | 脚本返回 / 后台 job | 脚本返回值 + run `stopReason` |
| `ralph` | fresh-agent 前台循环 | 每轮全新子代理 | 每轮 | 有界报告（自报） |
| `goal` | Goal Round Driver | 同一会话，跨轮 | 每轮结束 | `complete`（自报）；`blocked` 是另一终态 |
| `jobs` | producer + JobRegistry | 进程内 registry + 有界 ring | 异步 | `completed` / `killed` / `failed`，不等于模型已读 |
| `schedule` | Host 时间 | Host 存储 | 到期投递 | 到期事件，不等于业务完成 |
| `agent-teams` | Lead + 各成员 | 各自会话 + 任务板 + 邮箱 | 持续 | 任务状态 + Lead 把关 |

> 依据：`01-one-task-five-ways.md` 表；`delegation-primitives/00-map.md` 的「三类对象」；`delegation-primitives/07-shipped-mount-state.md` 的默认档位。

**读法**：阶梯不是“越重越好”的推荐表；官方只给各工具的边界句与互指，默认停在能完成工作的最浅一层。`todo` 与 plan 没有独立机制页；它们的边界句在 `primitive-selection/01`。

## 2. 四通道能力面（native）

| 通道 | 子代身份 | 独立 preset | 上下文 | 深度 | 控制 / 寻址 |
|---|---|---|---|---|---|
| `subagent`（spawn） | 全新 child | **支持**（`agentPreset` / `allowedAgentPresets`） | 不继承父对话 | 父 + 1（绝对） | `send_message` / `interrupt_agent`，按 child session id |
| `subagent_fork`（fork） | 父的已完成轮快照 | **不支持**（provider 能力位为 false） | 到最后一个 `turn/end` 的前缀，创建时捕获一次 | 父 + 1（绝对） | 同上 |
| `workflow` 的 `agent()` | run 的 parent 的新 child | **不支持**（`agent()` 只认 `label/phase/schema/provider/model`） | 该 provider 自己的上下文（spawn 即全新） | run 的 parent + 1（绝对） | 只有 run 返回值 / 后台 job；没有按分支 id 的控制工具 |
| `team` 成员 | Lead 的 child | **不支持**（`SpawnTeammateRequest` 没有 preset 字段） | `fresh` 或 `fork`，由 `context` 参数选；**默认 `fresh`** | Lead + 1（绝对） | `send_message` / `wait_agent`，按成员名 |

关键源码锚：

- spawn 的 provider 声明 `agentPreset: true`、`inheritsParentContext = false`：`vendor/dsh/packages/subagent/subagent-spawn-in-process/src/index.ts:39`-`46`。
- fork 声明 `agentPreset: false`、`inheritsParentContext = true`：`vendor/dsh/packages/subagent/subagent-fork-in-process/src/index.ts:61`-`68`。
- workflow 合法选项是闭合集合，未知键抛 `UNSUPPORTED_OPTION`：`vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts:33`、`:253`-`257`。
- team 请求字段只有 `name/description/prompt/context/provider/signal`；spawn 时 `startActivation` 不带 preset：`vendor/dsh/packages/experimental/agent-team/src/types.ts:165`-`172`、`src/roster.ts:264`-`274`。
- team 的 `context` 枚举与默认值：`vendor/dsh/packages/experimental/tool-agent-team/src/index.ts:61`（`enum: ['fresh','fork']`）、`:208`（`args.context ?? 'fresh'`）。

**两种“继承”别混**：

- fork 继承的是**父已完成轮的日志前缀**，不是父的当前上下文；创建时捕获一次。
- 省略 preset 的子代加入**父当前那一代 preset 修订**（引用同一修订，不是复制一份 YAML）；「继承组合」不等于「复制能力」。

> 依据：`preset-composition-and-contract-placement/01-channel-capability-differences-and-inheritance.md`；`composition/03` 的「省略 = 加入父修订」。

## 3. 选择政策与合同分层

### 3.1 策略随工具走

使用边界住在工具的 description 与 prompt section 里，不在部署 persona，也不在 `docs/` / 包 README（它们不自动注入）。工具被 disable，它的 description 与 section 一起从模型视野消失；组合就是选择面。

后果：① 看不见的原语不会被选中；② 替换工具 = 替换策略；③ 没有中心组件校验选择是否正确；④ 如果你在引擎之外补控制面（例如自己的 run 查询工具），要按「接缝 / 代价 / 退出条件」记账，否则会变成隐性第二引擎。

> 依据：`perspectives/03` 的四个后果；`composition/04` 的四种载体。

### 3.2 四种合同载体

| 载体 | 模型可见 | 作用域 | 成本 | 适合 |
|---|---|---|---|---|
| 工具 description / 参数 description | 该工具注册时才可见 | 每个工具实例 | 每次请求都在 | 这个工具自己的边界句 |
| `ctx.systemPrompt.section` | 在该 scope 的每次请求里常驻 | 注册它的 scope | 每会话常驻 token | 必须先于行动生效的规则 |
| skill（`tool-skill` + `skill-filesystem`） | 调用 `skill` 时才进入 | 挂载了该目录的 preset | 加载时一次性 token，受 8192 裁剪 | 长流程、方法、references |
| docs / README | 不自动注入 | 人 | 零 | 维护面、审计、交接 |

**两条分层规则**：

1. **政策 vs 引擎事实**：政策（什么该做、谁负责）稳定、由部署方拥有；引擎事实（`null` 含义、截断阈值、终态词表、重启后什么会丢）随 pin 变、由上游拥有。两者生命周期不同，不能塞进同一个载体。
2. **按能力存在性注入**：有 `workflow` 工具行的 preset 才需要 workflow 的引擎段；没有该工具时，那段文字是纯 token 税，还会诱导模型调用不存在的工具。

> 依据：`composition/04` 的「为什么必须分两层」与「按能力注入，而不是按角色复制」；`selection/03` 的「空白是设计的一部分」。

### 3.3 官方没说清的地方

官方没有一张推荐顺序表，只有边界句与互指；`fresh ↔ fork` 没有模型级路由；`goal ↔ schedule` 无互斥说明；「何时转后台」无统一规则；`explicit-ask` 只是 prompt 约束。插件作者必须自己补决策面，但**空白要标成空白，不能写成事实**。

> 依据：`primitive-selection/03` 的九条空白；`selection/02` 的升级阶梯。

## 4. 深度与容量

- **深度是绝对量**：`resolveChildDepth(parent, maxDepth) = delegationDepthOf(parent) + 1`；持久 header 是单调 floor；`maxDepth` 是**这一行的上限**，不是“链上的总预算”。
- **预算按行取用**：工具行显式 `maxDepth` 优先；省略时读 Host `subagent.maxDepth`（初始 1）；`0` 禁止委派。
- **workflow 分支也计数**：`agent()` 不收 `maxDepth`，但分支 child 是 run 的 parent + 1；分支里再 spawn 继续 +1。
- **team 成员从 Lead 数**：成员的 parent 是 Lead，后续委派从 Lead 的深度继续。

源码锚：`vendor/dsh/packages/subagent/subagent/src/depth.ts:20`-`35`、`child-agent.ts:49`-`58`、`subagent/src/index.ts:242`-`248`；`workflow-ptc/src/host.ts:203`-`219`。

**容量是局部量，不相加**：continuable Activation 默认 8；workflow concurrency 默认按核数；workflow total 默认 1000；单次 `parallel`/`pipeline` 默认 4096；jobs 每个 owner 默认 10；team 默认 `maxMembers=16`（官方 profile 钉 8）、`maxTasks=256`、单消息 64 KiB。没有全局公平调度器。

> 依据：`composition/06` 的预算维度与「深度不是横向容量」。

## 5. 观测与证据

- **观测是只读投影**：图不调度、不取消、不写状态；缺数据标 `unavailable`，不伪造。`completed` 只说明循环停了；任务 `completed` 只是状态；`ready` 不自动派发。
- **证据分层**：声明 → 挂载 → 实际工具面（`request/header.tools`）→ 行为，每层只证明自己那层。挂载绿 ≠ 行为绿；fake 只证明 fake；单次 ≠ 稳定。
- **行为层跑两遍**：强制型证明链路能通，自然型证明提示面内化。

> 依据：`observation/05`、`observation/07`；`02-terms-and-planes.md` 的三个平面。

## 6. 对照本仓时要问的五个问题

1. **能力面**：这个角色真正能看见哪些通道？政策/人格里提到的通道，是否都在它的工具面里？
2. **合同载体**：这条规则必须在行动前被看见吗？如果在，它为什么住在按需 skill 而不是 section/description？
3. **深度**：这条 `maxDepth` 限制的到底是“直接 child 的绝对深度”，还是被当成了“这条链还能往下几层”？
4. **上下文**：team/fork 的“继承”是组合继承、对话前缀继承，还是会议上下文？默认值是什么？
5. **证据**：这条结论是哪一层？声明、挂载、实际工具面、行为，还是单次观察？

这五问就是主材料 GAP 登记的检查轴；本页只给基线，不替本仓下结论。
