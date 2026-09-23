# 10 · 架构：repo 形态、组合层设计与插件计数

> 总入口与决策台账：[00-index.md](../00-index.md)。
> 依据：FAQ 13（`_faq_on_digested/13_expert-plugin-repo-organization`）+ DSH 源码工作树逐条核实
> （`packages/preset/*`、`packages/subagent/*`、`packages/experimental/agent-team/*`、`packages/workflow/*`、
> `docs/subsystems/{agent-team,subagent,skills,workflow,spill}.md`）。
> 性质：动工前的设计决策记录；实现开始后"当前合同"归本目录维护，单次决策归 `notes/`。

---

## 0. 一句话结论

你的方向合理，但有一个关键的概念纠偏：**"角色"的 DSH 原生载体是 agent preset（组合文件），不是插件（代码包）**。
正确形状：Option A 独立 repo + **一个 company pack**，pack 里 host/profile 层放共享行，
`presets/ceo|vp-eng|vp-sales|coo|cfo/` 每角色一个薄 preset（persona + 角色 skills + 角色工具行；五角色 R2 定稿）；
协作用 DSH 已有的通道（delegation / Agent Teams / workflow），不自造调度器。
"每角色完全隔离的 skills 面"和"角色间深度协作"在 DSH 里是一对真实的张力（见 §4 分水岭），
要按场景分层选通道，不能指望一个机制同时给到极致。

---

## 1. 概念纠偏：角色 = preset，不是插件

### 1.1 DSH 的四个层次，别混

| 层次 | 载体 | 回答的问题 | 在本项目的对应 |
|---|---|---|---|
| 代码包（plugin package） | npm 包，导出 Cordis 插件 | 有没有**新代码**（自定义工具/服务/流） | 只在角色需要专属工具时才出现 |
| bundle（`dsh.bundle.patch`） | pack 的 `cordis.patch.yml` | 装进来时默认加哪些**行** | company pack 的 host 层共享行 |
| profile / patch | `$DSH_HOME/profiles/<p>` | 部署级组合选择 | `company` profile：共享行 + team 行 + preset roots |
| **agent preset** | 一个目录一个 `agent.cordis.yml` | **一个会话**挂什么（工具/prompt sections/skills/persona） | **每个角色一个 preset** |

依据：`docs/architecture.md` 的组合链（package → bundle → profile/patch → app 启动 Loader）；
`packages/preset/README.md`（"a session composed from a preset runs that preset's tools, prompt
sections, and skills while every other session keeps its own"）。

### 1.2 一个角色 preset 里有什么（shipped `cordis` preset 就是范本）

`packages/preset/agent-presets/presets/cordis/agent.cordis.yml` 展示了完整配方：

```yaml
# ① 身份：persona row，shadow 掉部署默认人格，只对这个 preset 的会话生效
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    prefix: |-
      你是 VP of Engineering，……（{{model}}/{{cwd}} 可插值）
    # complete: true            # 极端收紧：整个 system prompt 只剩 prefix
    # includeRuntimeContext: false  # 关掉运行时上下文快照

# ② 角色专属 skills：skill-filesystem 行指向 preset 自己的 skills/ 目录，
#    落在【本 preset 的 scope layer】，别的会话看不见（skills registry 分层机制）
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - !!js "process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))"

# ③ 该角色可见的工具行（fs/bash/检索/委托/……按需增删）
- id: tool-fs
  name: '@deepseek-ai/dsh-tool-fs'
```

三个机制要点（都已在源码核实）：

- **persona**（`packages/preset/persona`）：`prefix`/`suffix` 是模板；`complete: true` 让整个
  system prompt 只剩 persona；`includeRuntimeContext: false` 连运行时上下文快照都关掉。
  只能挂在 preset 组合内（全局挂会与 prompt registry 的部署 persona 冲突、fail loud）。
- **skills 硬隔离**（`docs/subsystems/skills.md`）：registry 是 host + per-scope 分层，
  "a plugin mounted by an agent preset's standing composition lands in that preset's layer"，
  读时合并 scope 链、最近层同名直接赢。→ CEO preset 挂 CEO skills 目录，VP preset 挂 VP
  skills 目录，**互不可见**，这正是"每个角色有自己的 skill、单独隔离"的官方载体。
- **preset 目录可以带资产**：shipped preset 目录 = `agent.cordis.yml + preset.yml（显示名/描述）+
  skills/`；authoring 是 copy-only（拷整个目录进 `<dshHome>/.agent-presets`）。

### 1.3 所以"组织插件 + N 个角色插件"应该倒过来

不是写 N 个插件包，而是：**一个 pack 提供"公司"这个产品的全部**——
host 层共享行 + N 个角色 preset + 共享 KB + 模板。插件包（代码）只在两种情况出现：
① 有真正要写的自定义工具/服务（如 org_chart 工具、公司知识检索工具）；② 某角色的代码独立演化
到值得拆包（FAQ 13 决策 2：拆分只在角色独立演化时发生；生态 90%+ 单包起步）。

---

## 2. 插件计数：到底写几个包

**直接答案：1 个（company-pack），而且第 0 天它可以是零行 JS 的"纯配置插件"。**

角色数量与包数量无关——角色是 pack 里的**目录**（preset），不是包。DSH 语义里：
**包 = 发布单位（npm 包，一个 `dsh.bundle.patch`），行 = 组合条目（cordis.yml 里一行）**。
一个包可以提供多行（subpath 行，如官方 `@deepseek-ai/dsh-tool-subagent-control/list-agents` 的写法）。
所以本项目会组合出 ~15-20 个**行**，但自写的**包**始终是 1 个，直到出现拆包触发条件。

### 2.1 三层拆解（代码量从零开始长）

| 层 | 内容 | 自写 JS |
|---|---|---|
| ① 纯配置层（第 0 天） | `presets/<role>/`（agent.cordis.yml + persona 行 + skills/ 目录）、共享 KB、`cordis.patch.yml`、`profiles/company.cordis.yml` | **0 行** |
| ② 第一段真代码（按需） | M2 委托 provider（给委托 child 挂角色 preset，见 [20-roles-isolation.md](./20-roles-isolation.md) §2/§3，百行级）；自定义工具行（org_chart、公司检索） | 同一 pack 内新增行 |
| ③ 拆第二/三个包 | 触发条件（FAQ 13 决策 2 纪律）：某块代码独立演化 / 出现第二个消费方 / 独立发版需求；长出一窝专家才升方案 D | — |

### 2.2 编排主通道（已核定，见 00-index 决策台账 D4）

demo 形态"事件从 CEO 进、从 CEO 出"首选 **Agent Teams（M4）**——只有 Lead 能创建/interrupt
teammates（组织指挥权内建）、共享任务板 DAG、VP 间持久邮箱、teammates 保留 one-shot
`subagent` 工具给各自 workers（`agent-team-profile/cordis.patch.yml` 核实：disable 的只是
全局 continuable 控制，`tool-subagent` 压成 one-shot 后仍可用）。
因此 demo 第 0 天不需要任何自定义 provider——层② 是组合隔离的增强，不是 demo 门槛。

### 2.3 装但不写的行（cordis.patch.yml / profile 的行清单，全是现成包）

```yaml
# host 层（profiles/company.cordis.yml）
- @deepseek-ai/dsh-agent-presets          # roster；roots 指向本 pack 的 presets/
- @deepseek-ai/dsh-session-persistence-jsonl  # team 激活前提
- @deepseek-ai/dsh-experimental-agent-team       # M4 域服务（或直接装 agent-team-profile）
- @deepseek-ai/dsh-experimental-tool-agent-team  # M4 九个工具
- @deepseek-ai/dsh-workflow-worker-thread + dsh-tool-workflow  # CEO 的流水线（可选）
# 各角色 preset 内的行（按角色选配）
- @deepseek-ai/dsh-persona               # 每角色一行（人格）
- @deepseek-ai/dsh-skill-filesystem + dsh-tool-skill  # 角色 skills 目录进自己的 layer
- @deepseek-ai/dsh-tool-fs / dsh-tool-bash / dsh-tool-fs-search / dsh-tool-web / dsh-tool-todo / dsh-tool-present …
- @deepseek-ai/dsh-tool-subagent          # CEO 的 vp_eng/vp_sales 委托行（per-instance persona）
```

---

## 3. 协作通道盘点：DSH 已经给了四条，选着用

> 术语约定：本节按**机制**分四条通道（A–D）；[20-roles-isolation.md](./20-roles-isolation.md) §3
> 按**用法**分四种编排（M1–M4）。映射：M1 人中继＝多会话直用机制；M2 隔离委托＝通道 A 的
> 自定义 provider 强化版；M3 SDK 编排＝通道 C；M4 团队＝通道 B。通道 D（workflow）是任意
> 编排里 CEO 手里的"流水线"工具，不单独构成编排。

### 通道 A · 命名委托工具（stable，最贴近"汇报线"）

CEO preset 里给每个直接汇报对象配一个 `dsh-tool-subagent` 实例（persona 是 **per-instance 固定**的，
`packages/subagent/tool-subagent/README.md`："another persona … requires another distinctly named tool"）：

```yaml
- id: tool-vp-eng
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: spawn
    toolName: vp_eng          # CEO 的模型看到的就是一个叫 vp_eng 的工具
    backgroundMode: continuable
    persona: |-
      你是公司 VP of Engineering……管理研发管线……
    # toolFilter: …           # 可裁掉该角色不该用的工具
- id: tool-vp-sales
  name: '@deepseek-ai/dsh-tool-subagent'
  config: { provider: spawn, toolName: vp_sales, backgroundMode: continuable, persona: … }
```

- continuable child 是**持久会话**，可被 `send_message` / `interrupt_agent` / `list_agents`
  （`dsh-tool-subagent-control`）继续驱动；cold-resume 支持。
- 子代理可有自己的 persona（shadow 部署人格）和 toolFilter——但见 §4：**工具/skills 面继承父会话**。
- 消息只能相邻层级（父↔子）；VP 之间不能直接通信，要经 CEO 中转——这恰好就是"汇报线"的形状。
- **与 team bundle 的组合冲突（核实过 patch 源）**：`agent-team-profile` 会 disable 全局
  `tool-subagent-control`（send_message/interrupt_agent/list_agents）并把 `tool-subagent`
  压成 one-shot，而团队的九个工具**只覆盖 team 成员**——若装着 bundle 再加 continuable
  命名委托行，这些 child 将无法被续驶。两条解法：① **已定（R1 起就是这么做的）**：不装官方
  bundle，把 `agent-team` + `tool-agent-team` 两行直接 insert 进本包 `cordis.patch.yml`
  （仍是零 JS；R3 的"改直插行"因此已完成，只剩验证）；② 保持 bundle，把命名委托行也设为
  one-shot（放弃续驶）。
  ⚠ **R3 待验证点（别当成已成立的事实）**：团队工具是 **scoped 注册**，"shadow those globals
  **for team members only**"——而 **Lead（CEO）自己也是 team member**。所以"CEO 会话里
  spawn 过 teammate 之后，还能不能用 `send_message`/`list_agents` 驱动命名委托生出来的
  非 team continuable child"是未验证假设，由 R3 的 `delegation-smoke` 真跑判定；结论写进
  `delegation.md`（见 roadmap R3 行的"并存不互破"验收）。

### 通道 B · Agent Teams（experimental，最贴近"公司开会"）

`packages/experimental/agent-team` + `tool-agent-team`：Lead（CEO 会话）用 `spawn_teammate`
创建具名 teammates（VP 们），全员拿到 9 个工具（spawn_teammate / send_message / list_agents /
wait_agent / interrupt_agent / team_task_*）。

- **持久邮箱**：任意成员↔任意成员（VP 之间可以直接通信），消息 Steer 投递（running 就近步边界、
  idle 开新轮、inactive 冷恢复），不丢不重，崩溃可恢复。
- **共享任务板**：CAS 修订号、`blockedBy` DAG、`writeScopes` 路径提示（advisory 重叠告警），
  Lead 可指派，成员认领/完成/释放/重开。
- teammate 可以 `fresh`（干净上下文）或 `fork`（继承 Lead 已完成轮次——**会议上下文下发的现成机制**）。
- 代价与约束：**experimental、无稳定性承诺**（必须钉 vendor tag + 升级环）；teammates 共享 Lead 的
  composition（§4）；flat roster（只有 Lead 能建人、不能嵌套团队、名字不复用）；一个进程一个共享
  checkout；`maxMembers` 默认 8；需要 `dsh-session-persistence-jsonl` 才激活。

### 通道 C · dsh-sdk 子进程（hard isolation，one-shot）

`packages/subagent/subagent-dsh-sdk`：每个 child 是**完整独立的 Harness runtime**——自己的
profile（`profile` + `patches` 配置）、自己的 composition/skills/model route。

- 这是"每个角色真正独立组合"的唯一 in-tree 通道：给每个角色配一个 provider 实例 + 一份角色
  profile（内含该角色 preset 的行），CEO 委托时选对应工具。
- 代价：每 run 起一个完整 runtime 进程（无池化）；**one-shot**，父只拿到最终文本（中间过程留在
  child 自己的 session root）；不支持 persona/toolFilter（由 child profile 自己决定）。
- 适合"出一份稿子"式的任务式协作，不适合持续对话。

### 通道 D · Workflow 脚本（脚本化流水线）

`dsh-tool-workflow` + worker-thread 引擎：模型写一段 JS 编排脚本，`agent()` fan-out 子代理，
带 phase/pipeline/parallel。适合"一次写作流水线"：CEO 出 brief → 各 VP 并行出稿 → 汇总审阅。
children 仍 join 父 composition；脚本是一次 run，不是常驻组织。

---

## 4. 分水岭约束：composition 继承（设计前必须想清楚的一条）

`packages/preset/agent-presets/README.md` 原文：**"A child agent (subagent) joins its parent's
composition, so it sees the same tools and prompt sections as the agent that spawned it."**

也就是说，在通道 A/B/D 里：

| 隔离维度 | team/委托树内的 child | 独立 preset 会话（各开各的） | dsh-sdk child |
|---|---|---|---|
| 会话历史/上下文 | ✅ 独立 session | ✅ 独立 | ✅ 独立 |
| 人格（system prompt 身份） | ✅ per-child persona / name+description+team:policy | ✅ preset persona | ✅ child profile 决定 |
| 工具面 | ⚠️ 继承父（toolFilter 只能裁） | ✅ preset 自选 | ✅ 独立 |
| **skills catalog** | ❌ 共享父会话的 | ✅ **per-preset layer 硬隔离** | ✅ 独立 |
| 角色间直接通信 | B✅（邮箱）/ A❌（相邻才可） | ❌（人来中转或无） | ❌ |

结论：**"每角色硬隔离的 skills/工具面"与"一个组织里深度协作"不可兼得于一处**，按场景分层：

- 隔离优先（各写各的深度文档、各自的专业判断）：独立 preset 会话（日常）或 sdk child（编排内）。
- 协作优先（会议、任务板、互相 review）：Agent Teams，角色差异靠 name/description +
  team:policy + KB 目录约定（软隔离），上下文隔离（每成员独立 session）仍然是硬的。

注意你说的"上下文管理来得方便"这半句直觉是对的：**无论哪条通道，每个角色的会话历史、
compaction、token 计量都是独立的**；persona 前缀稳定还对 KV cache 友好。

---

## 5. 知识库（KB）的三个载体，按性质分

| KB 性质 | 载体 | 机制 |
|---|---|---|
| 产品化角色知识（随 pack 发布、随版本走） | 各 preset 目录内 `skills/` | per-preset scope layer，硬隔离（§1.2） |
| 公司共享手册（全员可见） | 全局 skills root（`<dshHome>/skills`）或项目 `.dsh/skills` | skills registry 全局层；project root rank 更高 |
| 活数据（公司 wiki、产出物、会议纪要） | 共享 workspace 文件 + fs 工具 | 团队共享一个 checkout；最终产物用 `present` 工具标记 deliverable |

- spill store（`ctx.spillStore`）**不是**这个用途——它是 tool 输出溢出的持久化，别拿来当公司记忆。
- 团队的任务板/邮箱状态在 Lead session 日志里（durable、可回放），不需要自建数据库。
- "角色私有目录"在团队里靠约定（`kb/<role>/` + 任务板 writeScopes 是 advisory 告警不是锁），
  真要硬隔离就回到独立 preset 会话。

---

## 6. 推荐目录树（Option A，单 pack 起步）

```text
ai_dsh_company/
├── AGENTS.md                     # 入口链：怎么跑、DSH 源在 vendor/dsh、探索路由、DSH_HOME 兜底
├── CLAUDE.md -> AGENTS.md
├── pnpm-workspace.yaml           # packages/* + vendor/dsh 全树（packages/*/* + apps/* + vendor/* + native/system*）
├── package.json                  # private root；dsh script 指向 vendor/dsh 的 CLI 入口；
│                                 #   devDeps 含四个 insert 行的 workspace:* 链接（require.resolve 解析需要，R1 实证）
├── tsconfig.json                 # 源码面门面：extends vendor base（paths → vendor src）
├── packages/
│   └── company-pack/             # 唯一发布载体（自包含），第 0 天就这一个包
│       ├── package.json          # dsh.bundle.patch + runtime deps（精确钉 0.1.5-rc.2）
│       ├── cordis.patch.yml      # bundle 行（host 共享面）：agent-presets 替换 + 团队/present insert
│       ├── presets/
│       │   ├── ceo/              # agent.cordis.yml（persona + delegation 工具行 + team 使用策略）
│       │   │   ├── preset.yml    # 显示名/描述（picker 里看到的"CEO"）
│       │   │   └── skills/       # CEO 专属 skills（战略、会议主持、任务拆解……）
│       │   ├── vp-eng/           # 同构：persona + skills/（研发管线、技术评审……）
│       │   ├── vp-sales/
│       │   ├── coo/
│       │   └── cfo/
│       └── src/                  # 自定义工具/服务（org_chart、公司检索……有了再建）
├── company-workspace/            # 运行时"公司共享盘"：会话的 cwd（gitignore 运行残留）
│   ├── kb/                       #   活 KB（handbook、各角色 wiki……）
│   ├── templates/                #   文档模板（PRD/周报/评审……）
│   └── deliverables/             #   产出物落这里，用 present 标记
├── vendor/dsh/                   # git submodule 钉 release tag（agent 探索 DSH 源码的红利）
├── dev/
│   ├── env.sh                    # 双 home 兜底（DSH_HOME）+ 裸 dsh 拦截
│   ├── company.overlay.yml       # headless + --patch 实验/动议用的 insert overlay（无 web-app 行的组合）
│   └── harness-home/             # 开发 DSH_HOME（双 home 隔离；gitignore 运行残留）
├── scripts/
│   ├── verify.mjs                # 结构/链接/自包含门禁
│   ├── release-smoke.mjs         # npm pack → 干净 profile → dsh plugin add → 冒烟会话
│   └── sync-dsh.mjs              # vendor 换 tag + SHA 簿记 + typecheck + 矩阵加列
├── docs/                         # 当前合同（只写 now）：preset 语义、KB 布局、协作通道选择
├── notes/                        # intents.md + proposed/ + implemented/
└── snapshots/                    # 自建最小 replay（JSONL 日志 diff 起步，够用再升）
```

要点：

1. **工具面归 preset 自己声明（自包含）；profile/bundle 行只管全局服务与默认行**（R1 二次实证：
   原设计"共享行放 host/profile 层、preset 只放差异"**对工具面不成立**——R1 首跑 CEO 会话只拿到
   bundle 加的 10 个工具（团队 9 + present），没有 fs/skill，于是读不了 CHARTER、加载不了 skill、
   **写不出交付物**）。shipped `standard` 同样是自包含：255 行里自己声明
   tool-bash/tool-fs/tool-fs-search/tool-skill/goal/planning/compaction/delegation/…。
   故每个角色 preset 声明自己那套工具行（复制式演化——DSH 无 patch 继承）；pack 的
   `cordis.patch.yml` 只负责**全局行**（agent-presets roster、团队两行、present）。
   代价：4 个角色各持一份工具行清单（R2 补另两个时照抄）；换来按角色的最小权限工具面。
2. **presets 进 roster 的落法**（FAQ 13 已核实 + R1 实证）：pack 里的 `presets/` 不会自动进
   roster，`dsh-agent-presets` 只扫 shipped 根 / 配置 `roots` / 用户根。roots 行写在 pack 的
   bundle 里，且**用替换语法覆盖 web-app 的出厂 `agent-presets` 行**（default: standard → ceo）；
   roots 路径用 `!!js` + `baseUrl` **自定位**到本包安装目录的 `presets/`，任何安装位置都对。
   纯 headless 组合没有这行，用 `dev/company.overlay.yml` 的 insert 补。
3. **experimental team 两包是 host 行**（服务注册 + per-member scoped 工具安装），加
   `dsh-session-persistence-jsonl` 才激活；以 `- insert:` 行随 bundle 走（R1 起直插，
   不装官方 bundle，故无续驶控制冲突）。
4. **双 home**：日用 `~/.dsh` 不动，开发 `DSH_HOME=<repo>/dev/harness-home`，环境脚本兜底
   （coding agent 不会自己想起这个区别）。
5. **已知开放点（R1 实测）**：company profile（base + 本 pack，**无 web-app**）里 agent-presets
   行在源码 CLI 下挂起（进程不退、无输出；同一行在 web profile 组合里正常）。观察窗改用
   web profile 绕开；根因未定，记在 R1 Note 的"未验证"。
6. **preset 挂载只在 Web 面**（R1 实测，机制级）：只有 `web-app` bundle 组合 `session-controller`
   （headless / sdk / acp 都是 0），而 `composeAgent`（"session 未指定 preset 时挂 default"）
   住在 session-controller 里。**headless 一次性驱动直接经 core agent registry 建 agent，绕过
   preset 组合**——所以 headless 会话永远是部署默认人格（headless bundle 自己那行
   `personaPrefix: "You are a coding agent…"`），角色内容（persona / 专属 skills）**只能在 Web
   会话里生效**。推论：入戏探针与 demo 动议必须走 Web UI；自动化验证属 R5 的 web 快照 lane。

---

## 7. 分阶段落地

开发队列已独立为 [../ROADMAP.md](../../ROADMAP.md)（根部队列文件，D24；完成即离队：
验收标准进合同、决策进 notes/，队列只写"接下来"）。

## 8. 风险与先验证清单

- **experimental 漂移**：agent-team 无稳定性承诺，契约可自由变。→ vendor 钉 tag + SHA 簿记 +
  `sync-dsh.mjs` 升级环 + compatibility 矩阵；升级前看 `_digested/_change_log/`。
- **maxMembers 默认 8**：CEO + 3 VP 没问题；要扩编制就调 config（startup 校验，fail loud）。
- **共享 checkout 的越界写**：writeScopes/KB 私有目录都是约定级；要硬隔离用独立 preset 会话或
  sdk child。
- **日志税**：以后写自定义工具时，每个模型可见的新状态都要配 `SessionEventMap` 成员，否则
  JSONL 回放不出来（dev-loop 第 3 阶段第 2 问）。
- **preset 复制式演化的坑**：改共享行要记得 4 个 preset 都看得到的是 host 层那份；preset 内只放
  差异，别把共享行复制进 preset。
- **第 0 天别做**：registry.json / shared 包 / 每角色一个 npm 包 / OpenSpec——等触发条件
  （第二个独立演化的专家、第二贡献者）再上（FAQ 13 推荐路径）。

## 9. 触发升级的路径（预埋，不预建）

- 角色长出独立演化的自定义代码 → `company-pack` 内拆内部包（发布载体仍是 pack）。
- 长出一窝专家（市场部、法务部……各自独立产品）→ 升 FAQ 13 方案 D：本 repo 结构原样变成
  `packages/<one-expert>/`，加 registry + templates。
- 要给 DSH 上游提 seam（比如 per-teammate composition）→ 方案 B 通道进 DSH repo 做，本 repo
  只留消费者。
