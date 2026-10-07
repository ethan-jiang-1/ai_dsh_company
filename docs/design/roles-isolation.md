# 每个角色完全独立 · 深挖篇（context / tools / knowledge / workflow 的机制级安排）

> 什么时候读：动角色隔离、上下文/工具/KB 边界，或委派机制前。
> 承接 [architecture.md](./architecture.md)。那一篇回答"repo 怎么摆"；
> 这一篇回答你这次的问题：**长期做 Agent 的人最在乎的"每个 Agent 上下文完整独立"，
> 在 DSH 里到底怎么安排最合理**。全部结论在 DSH 工作树源码逐条核实（关键处标了文件）。

---

## 0. 结论速览

你要的"独立"拆开是六个面：**五个面有硬机制**（不是约定，是 scope/registry 级隔离：上下文/
工具/知识/工作流/人格），第六个面——"角色间常驻对话 + 每角色独立组合同时成立"——是当前
**唯一的结构性缺口**，但有三种官方姿势绕过，且有一条明确的上游 seam 提案路径；
另有两个次要面（模型路由、工作目录）附在表尾。

| 独立面 | DSH 硬机制 | 载体 |
|---|---|---|
| 独立上下文（会话历史） | 每 session 一条 append-only JSONL log，独立 compaction、独立 token 计量 | session 本身 |
| 独立工具面 | preset 工具行 + scope 链（restrict 沿链取交集，被过滤的工具在提示词和执行里都"不存在"） | `agent.cordis.yml` |
| 独立知识/skills | skills registry 分层：preset 挂载的行落在**该 preset 自己的 layer**，读时合并 scope 链、最近层同名直接赢 | preset 的 `skills/` 目录 |
| 独立工作流 | `ctx.workflowEngine` 是 per-scope 能力：preset 自己的 `isolate` realm = 该角色自己的引擎实例；SOP 类流程=角色 skills | preset 的 workflow realm |
| 独立人格/系统提示词 | `dsh-persona`（prefix/suffix/`complete`/`includeRuntimeContext:false`） | preset 的 persona row |
| （附）独立模型路由 | 创建时 `agentOptions`（provider/model/effort/maxTokens） | 会话创建 / 委托工具配置 |
| （附）独立工作目录 | `meta.cwd` 每会话可不同（团队通常共享一个 checkout） | 会话创建 |

**核心安排一句话：一个 host profile + N 个角色 preset，每个角色是一个"挂自己 preset 的根会话"，
五个独立面全部成立。剩下的全部设计问题只在一处：角色之间怎么对话（§3）。**

---

## 1. 为什么"preset + 根会话"是独立的完全体

会话创建的正式路径（摘录自 `packages/api/session-controller/src/agent.ts:374-390`，
省略了与本问题无关的 model-selection 安装行）：

```ts
async composeAgent(presetId) {
  const resolvedId = (await presets.resolve(presetId)).id
  return {
    agentPreset: resolvedId,
    setup: async (agentCtx, agent) => {
      await presets.mount(agentCtx, resolvedId)   // ← 每个会话挂自己的 preset
    },
  }
}
```

挂上之后，scope 链（`_digested/session-and-loop/00-map.md` "每个 agent 的 scope chain"）：

- 注册表先读全局层，再沿 scope 祖先链读到当前 agent，**最近的同名注册赢**；
- preset 的 standing composition 是会话的**显式祖先层**——它的工具、prompt sections、skills、
  workflow realm 只对加入它的会话可见；
- `parentSession`/`delegationDepth` 只是持久 lineage 数据，**不自动建立 scope 父子**——可见性
  只由 `bindScopeParent` 的运行时绑定决定（这是 §3 裂缝的机制根源）；
- restrict 沿链取交集：一个角色 preset 不挂 `tool-bash` 行，该角色就没有 bash 工具，连提示词
  里都不会出现。

同时"一个进程跑多个不同组合的 agent"是 preset 组的明文承诺
（`packages/preset/README.md`："let one process run several differently composed agents at once"）。
上下文面：每会话独立 log（model-visible ⟺ logged，可完整回放）、compaction 是 preset 内的
realm 行（角色可各自选压缩策略）、token 计量按 session 键控。

**所以：五个角色（CEO / VP-Eng / VP-Sales / COO / CFO）各开一个根会话、各挂各的 preset，
你要的五个独立面一次全拿到，零自定义代码。** 缺的只是它们之间的对话通道——这就到了分水岭。

## 2. 分水岭的精确表述（这次挖到了底）

上一轮我说"child 继承父 composition"是硬约束——**这次挖穿了一半**：

- **默认行为**：spawn/fork 后端和 continuable 路径都用 `composeFrom(childCtx, parentCtx)`
  （join 父会话正在用的同一 preset generation），
  `packages/subagent/subagent/src/child-agent.ts:199-218` 的 `applyChildComposition`：
  先 join 父 preset，再叠 per-child persona（scoped section shadow）和 toolFilter（restrict）。
  **continuable 孩子（含 Agent Teams 的 teammates）被 continuation manager 固定走这条路**
  （`continuation-activation.ts:579-587`：`materializeTracked` 的 setup 无条件调
  `applyChildComposition`）——想给 teammate 换 preset，当前只能提上游 seam 或 vendor patch。
- **官方裂缝**：`ctx.agentPresets.mount(agentCtx, id)` 是公开 API，JSDoc 明说
  "Call from the agent factory's `setup(agentCtx)`"，而 `ctx.agents.create` 的 setup
  **是可 await 的**（`CreateAgentOptions.setup`：factory awaits setup after minting agentCtx，
  注册完成后才发布会话）。也就是说：**自定义 one-shot SubagentProvider 完全可以在子代理
  创建窗口里 mount 一个跟父会话不同的 preset**——child 拿到该角色完整的工具/skills/persona/
  workflow realm，同一进程内。session-controller 每会话挂 preset 用的就是同一个 API。
- **SDK 面**：SDK server 明确不按会话选 preset（`packages/sdk/server/src/server.ts:274-278`
  注释："A deployment that configures a roster has to join one here first"）——SDK wire 上
  每角色独立组合 = 每角色一个 profile/一个 runtime 进程。

## 3. 四种运行编排（把独立角色组织起来，按隔离强度排序）

### M1 · 多根会话 + 人中继（Web）

一个 `dsh web` 进程，N 个会话各挂各的角色 preset，你在标签页之间当"总机"。
零代码，五个独立面满格。适合：早期验证角色人设/知识库质量、你自己就是 CEO 的"人肉编排"模式。

### M2 · CEO 会话 + 每角色 one-shot 委托工具（自定义 provider，§2 裂缝）

> 定位（对齐决策 D4）：demo/组织模拟的**主通道是 M4**；M2 是"组合硬隔离"的增强——当某次
> 委派必须让 child 拿到该角色完整的 skills/工具面（而不只是人格）时才需要它。

写一个 `company-delegation` 插件：注册 N 个 one-shot SubagentProvider（`vp-eng`/`vp-sales`/…），
每个 provider 的 `start()` 里 `ctx.agents.create({ ..., setup: async (childCtx) => {
await childCtx.get('agentPresets').mount(childCtx, '<role-preset>') } })`。
再给 CEO preset 配 N 个 `dsh-tool-subagent` 行（`toolName: vp_eng`，provider 指向对应 provider）。

- **组合完全独立**：每次委托的 child 拿到该角色的完整 preset 面（工具/skills/persona/workflow）。
- 走的是正式 seam（subagent registry）：descriptor、深度记账、`subagent/start|end` 事件、
  权限收窄（delegated child approval 钉死 `'never'`、sandbox 沿父覆盖——角色天然最小权限）全免费。
- 代价：one-shot——每次 brief 是一个新会话，没有"跟 VP 的连续对话记忆"。要连续对话见 M3/M4。
- 实现提示：自定义 provider 不要从零拼创建窗口——复用 `packages/subagent/subagent-in-process-driver`
  的组合路径（`applyChildComposition` / `appendDelegatedPolicyOverrides` / descriptor 追加），
  只把其中的 `composeFrom` 换成 `mount(childCtx, '<role-preset>')`，深度记账与权限收窄语义保持一致。

### M3 · 每角色一个 SDK runtime + 外部编排器

一个编排器程序（纯 TS，用 `@deepseek-ai/dsh-sdk-client`）给每个角色起一个 runtime 进程
（每角色一个 profile，其 host 组合/默认 preset 即该角色面），`session(id)` 句柄多轮驱动，
`run(input, { sessionId })` 反复进出，编排器在角色间路由消息。

- 最硬隔离（进程级）+ 常驻多轮 + 每角色可独立模型路由/升级节奏。
- 代价：要写编排器；每角色一个进程的成本；跨进程只有最终文本和事件流，没有内建邮箱。

### M4 · Agent Teams（experimental）

内建最像"公司"的协作面：持久邮箱（任意成员↔任意成员，Steer 投递、不丢不重、崩溃恢复）、
共享任务板（CAS 修订 + `blockedBy` DAG + `writeScopes` 告警）、`fork` teammate 下发会议上下文。
现成包（0.1.7 现状）：host 侧 = `@deepseek-ai/dsh-experimental-agent-team` +
`@deepseek-ai/dsh-experimental-tool-agent-team`；Web UI 侧 = `@deepseek-ai/dsh-experimental-client-ui-agent-team`
（名册/任务板/teammate 导航）。**本仓不装官方 profile bundle，改为在 pack 的 `cordis.patch.yml` 里直插这些行**
（R1 起，避免 bundle 关掉全局续驶控制——见 [architecture §3 冲突注](./architecture.md)）。
（`agent-team-profile` / `agent-team-web-profile` 两 bundle 包在 rc.2 vendor `experimental/` 均在；直插的取舍理由见上行与 [architecture §3 冲突注](./architecture.md)。）

- 代价（§2）：teammates **共享 Lead 的组合**——独立降级为"独立会话上下文 + per-child 无、
  靠 name/description + `team:policy` + KB 目录约定"。工具/skills 面是 CEO preset 的。
- 定位：协作密度高、角色差异主要在"判断力和知识"而非"工具面"的场景（评审会、互审、
  头脑风暴）；experimental 无稳定性承诺，vendor 钉 tag 是纪律。

### 选型速查

| 场景 | 选 |
|---|---|
| 验证角色内容（人设/KB/skills 质量） | M1 |
| **demo 主循环：事件从 CEO 进出、任务板分派、VP 互发消息（决策 D4）** | **M4**（接受组合共享） |
| 某次委派必须带该角色完整 skills/工具面（深度专业出稿） | M2（one-shot） |
| 需要角色间连续多轮谈判、且组合隔离不可让 | M3 |
| 全都要 | M4 打底，M2 按任务叠加（同一 CEO 会话两者可共存：团队工具 + 委托工具各占各的行） |

## 4. 两个诚实的缺口（写进 repo 的 notes/，别假装没有）

1. **"常驻角色对话 + 每角色组合独立"同时成立**——现在不存在。M2 独立但 one-shot；
   M4 常驻但共享组合；M3 常驻且独立但跨进程、无邮箱。若这成为刚需，正确姿势是照 FAQ 13
   的方案 B 路径向 DSH 上游提 seam：*continuable/teammate composition accepts a preset id*
   （`ChildComposition` 加一个 `preset` 字段，`materializeTracked` 的 setup 里按它 mount）。
   这个提案的自然落点已经存在——`applyChildComposition` 就是唯一收口处，上游改动面很小。
2. **跨会话长期记忆没有内建 seam**（`packages/` 无 memory 包；FAQ 08 也把长期记忆列为缺口）。
   角色的"经历"跨会话沉淀 = workspace 文件（`company-workspace/kb/<role>/journal/`）+ 角色
   skill 指引"开工先读自己的 journal"。这反而贴合公司隐喻：离职换人（换 preset/换模型），
   公司资产（KB/journal/deliverables）留在盘上。

## 5. 落到本 repo 的增量（对 [architecture.md](./architecture.md) §6 目录树的补丁）

```text
packages/company-pack/
├── presets/<role>/            # 不变：persona + skills/ + 工具行 + workflow realm
├── src/
│   ├── delegation/            # 新增：M2 的 one-shot providers（每角色一个，
│   │                          #   start() 里 mount 该角色 preset）
│   └── tools/                 # 可选：org_chart 等公司级工具
└── cordis.patch.yml           # bundle 行（host 共享面）：registry 替换 + 团队两行 + present + client
```

实施顺序（对齐决策 D4/D11；原文的垂直轮/队列排序已退役——D23/D24/D32，实施次序现由用户逐条给）：
M1（R1/R2 轮内最窄验证：角色独立会话入戏探针）→ **M4（R1 起 demo 主循环）** → 通道 A
命名委托工具（R3，零代码汇报线）→ M2（可选增强，触发条件见 §3 选型速查）；M3 仅当
"连续谈判"被证明刚需时再上。
