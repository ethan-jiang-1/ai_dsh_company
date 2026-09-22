# 数字分身的「被培养」与「自我学习」在 DSH 里由什么承载：机制研究

日期：2026-09-22
类型：内部机制研究笔记（primary sources only：**只以 vendor 树为准**）
基线：`vendor/dsh/` @ tag `dsh-v0.1.5-rc.2` = `fb2c4b9e698e30edb738bca4cf0618587db7d203`（本仓钉住的唯一权威；**不看日用全局安装的行为**）
范围：只回答"机制上由什么承载、边界在哪"，不写愿望、不写产品设想。
约定：每条结论标 **【读到的】**（有源码/文档出处）或 **【推断】**（由已读事实推出，无明文）。行号为该 SHA 下的精确行号，路径相对仓库根。

> ⚠ **后续修订（2026-09-22，晚于本笔记）**：§C 的两条前置修复**已落地**、U1 **已在源码层回答**、
> §D 的"自学习可写落点"结论**被隔离改动推翻**、U2/U3 **作废**。读 §C / §D / §3 前先读
> 文末 [§5 后续修订](#5-后续修订2026-09-22本笔记之后)。

## 1. 一句话结论

**【读到的】** DSH 里**没有**记忆子系统：`docs/subsystems/` 的 40+ 个页面里没有 memory 一页，`packages/` 下没有 memory 包，唯一面向用户的 "memory" 面是三方 MCP 记忆服务器的互操作示例（默认关闭）。

- **「被培养」有 4 个可用载体，全部是文件**：① preset 组合文件（persona / 工具行 / skill roots）；② preset 目录下的 `skills/`；③ workspace 里的文件（journal / CHARTER / deliverables）；④ `<projectRoot>/AGENTS.md` 链（机制存在，但**本仓公司 preset 没接线**，见 C）。
- 角色数在写本笔记期间从 4 长到 5（R2 进行中，新增 `cfo`）；**机制结论与角色数无关**，C 的清单按 2026-09-22 当日快照记录。
- **「自我学习」只有 1 个真正可写的落点，而且是共享的**：会话 cwd 之下的 skill root（`<projectRoot>/.dsh/skills` 等）。角色私有的 skill 目录在 workspace 之外，自我写入被沙箱拒绝；运行时 `ctx.skills.register()` 是纯内存、不持久。
- **缺的三样**：① 没有第一方"记忆写入/检索"工具（学习必须伪装成普通文件读写）；② 没有"谁在什么时候教了这个分身什么"的记录（文件的历史不在任何会话日志里）；③ **没有跨会话自主节律**——`goal` 需人类授权且重启即 disarm，`schedule` 只在会话 live 时投递，`webhook` 能起会话却接不上 goal 循环。

---

## 2. 逐问

### A. 记忆载体：DSH 有没有 memory 子系统？

**结论【读到的】：没有。**

- `docs/subsystems/README.md` 的子系统表逐页列出全部子系统（core / llm-streaming / goal / schedule / persistence / skills / compaction / storage / workspace / subagent / agent-team / webhook / …），**无 memory 页**。`packages/` 顶层分组（`packages/README.md`）同样无 memory 组。
- 全树 `find -iname '*memor*'` 的命中只有：`packages/settings/settings/tests/memory.ts`（测试用的内存 backend）、`packages/storage/storage-domain/tests/helpers/memory-backend.ts`、`packages/experimental/webworker-runtime/src/storage/memory.ts`（内存 VFS）——都是"内存实现"，与"长期记忆"无关。
- 唯一的"记忆"用户面是 `docs/user/guide/mcp-memory.md`：三个**默认关闭**的三方记忆 MCP 服务器参考配置（Memorix / MCP Reference Memory / Engram），由 `dsh-mcp-client` 把它们当普通 MCP 工具暴露为 `mcp__<server>__<tool>`。文档自己声明 `DSH does **not** download the server, initialize its database, choose its model or embedding provider…`（`docs/user/guide/mcp-memory.md:15`），且 `No memory server is present in the shipped composition, so omitting --patch keeps all three disabled.`（同文件）。**这是互操作示例，不是 DSH 的记忆机制。**

**`compaction` 不是记忆——它是减法。** 它把 surface 上一段区间替换成一条 summary `user/message`（`surfaceOp: { op: 'replace', startSeq, endSeq }`），并记录被遮蔽的 seqs 与 token 数（`docs/subsystems/compaction.md:11` 的事件表）。会话日志只增不减，但**模型看得见的内容变少了**。把它当"记忆"是把方向搞反了。

**session persistence 也不是跨会话记忆。** `SessionPersistence` 的 `create`/`open`/`stat`/`list` 全部以 `SessionId` 为单位，`SessionHandle` 的注释写明 `Freshness across handles` 与单写者所有权（`docs/subsystems/persistence.md:5-7`、`:17-40`）。它保证的是"**同一个**会话重启后完整还原"，不是"新会话能记得上一个会话"。新会话从零开始。

**跨会话"学到的东西"实际只能落在这些载体上**（按模型可见性分组）：

| 载体 | 模型怎么看见它 | 持久性 | 依据 |
|---|---|---|---|
| workspace 文件（journal/CHARTER/deliverables） | 只有被 `read` 工具读了才进上下文；**没有任何自动注入** | 文件系统 | `packages/company-pack/presets/*/agent.cordis.yml` 的 persona 里"开工动作：先读 kb/<role>/journal/ 最近 3 篇"——靠 persona 指令，不靠机制 |
| 磁盘 skill 文件 | 目录经 `agent.inject()` 成 durable 目录消息；正文经 `skill` 工具结果 | 文件系统 | `docs/subsystems/skills.md:233`、`packages/skill/tool-skill/src/index.ts:213-251` |
| preset 组合文件（persona prefix / 工具行 / skill roots） | 渲染成 `system/message` surface 节点 | 文件系统（pack 安装目录） | `docs/subsystems/system-prompt.md:44` |
| `<projectRoot>/AGENTS.md` 链 | `dsh-agent-instructions` 在首个请求注入一条 durable 基线消息 | 文件系统 | `packages/context/agent-instructions/README.md` |
| `ctx.storage.domain` | **模型看不见**（无工具、无 prompt 文本、无 session 事件） | 后端（json/sqlite） | `docs/subsystems/storage.md:5`、`docs/subsystems/workspace.md:5` |
| `ctx.skills.register()` 运行时 skill | 经目录消息 | **进程内 Map，不持久** | `packages/skill/skill/src/index.ts:333`、`:441-462` |
| 三方 MCP memory server | MCP 工具结果 | 外部进程自己的存储 | `docs/user/guide/mcp-memory.md` |
| 会话日志本身 | 经 `deriveMessages()` 还原 | durable，但按 session id 隔离 | `docs/subsystems/persistence.md` |

**对本命题的意义**：**"被培养"与"自我学习"在 DSH 里都是文件操作，没有第三条路。** 不存在"教它一件事"的原生动作——只有"写一个文件"和"下次让它读那个文件"。任何指望"它会自己记住"的设计，机制上都落空；唯一能让学习自动生效的通道是 skill 目录消息（下一步重算 digest 后自动注入）与 `AGENTS.md` 链（首个请求自动注入），其余全靠 persona 指令驱动显式读取。

---

### B. skills 的 per-scope 分层

**结论【读到的】：是。一个 agent preset 挂载的 skill provider 落进该 preset 的 layer；多个角色可以各有一套同名 skills 而互不污染。**

**分层与归档规则：**

- 注册表是 host + per-scope 分层的，形状照 tools registry：`a registration files into the layer of its calling context's scope, so host rows and repository plugins land in the global layer while a plugin mounted by an agent preset's standing composition lands in that preset's layer, and provider names are unique per layer rather than process-wide.`（`docs/subsystems/skills.md:13`）
- 源码：`packages/skill/skill/src/index.ts:388-390`（`registerProvider` 的 JSDoc：`a scoped context (an agent preset's standing mount) registers for that scope alone, an unscoped context registers globally`）；真正决定 layer 的是 `packages/core/scope/src/store.ts:231` 的 `const scope = scopeOf(ctx)`。
- web-app bundle 自己把这条写成了注释：`a preset's skill-filesystem registers into that preset's layer, and each agent reads the merged catalog its scope chain selects`（`packages/bundle/web-app/cordis.patch.yml:392-400`）。

**nearest-layer-wins 与 rank 的确切规则：**

- **跨 layer**：读时先 global、再 chain（由远到近、最近的最后），后写覆盖 → `the nearest layer's entry wins a duplicate skill name outright`（`docs/subsystems/skills.md:13`）；源码 `packages/skill/skill/src/index.ts:553-558`（`collectFresh`：`Global first, then existing chain overlays farthest ancestor first and the exact scope last, so the nearest layer's same-name entry replaces the farther ones`）。
- **同 layer 内**：按 rank → provider 注册序 → provider 内局部序：`packages/skill/skill/src/index.ts:808-812` 的 `compareIndexedCandidates` = `rank || providerOrder || localOrder`。rank 的语义是 `Lower ranks win duplicate skill names before provider registration order is considered.`（`:76-77`）。
- rank 表（`packages/skill/skill-filesystem/src/index.ts:36-40` + `packages/skill/skill/src/index.ts:27-28`）：

  | Rank | Source | Root |
  |---|---|---|
  | 100 | `project-dsh` | `<projectRoot>/.dsh/skills` |
  | 200 | `project-agents` | `<projectRoot>/.agents/skills` |
  | 250 | `runtime` | `ctx.skills.register()` 的内存条目 |
  | 300 | `custom` | `Config.customSkillDirs` |
  | 400 | `user-dsh` | `<dshHome>/skills` |
  | 500 | `user-agents` | `<agentsHome>/skills` |
  | 600 | `bundled` | `Config.bundledSkillDir` |

**互不污染怎么成立【读到的】**：一个 preset 的 standing composition 只挂载一次，agent 通过**把 scope key 挂到该 mount 上**加入——`the mount's registrations and listeners cover every joined agent and no sibling preset's`（`packages/preset/agent-presets/README.md` 的 Design philosophy 节）。所以每个 agent 的 scope chain 只包含**自己** preset 的 layer，看不到别的角色的 layer；provider 名 per-layer 唯一，所以每个 preset 都能各有一个叫 `filesystem` 的 provider 而不冲突。

**一个反向陷阱【读到的，重要】**：本仓**所有** preset 的 `skill-filesystem` 都**没有**关掉 `includeDefaultRoots`（`grep includeDefaultRoots packages/company-pack/` 零命中 → 取默认 `true`，`packages/skill/skill-filesystem/src/index.ts:52-53`、`:78`），所以**同一个 provider 内部**还会扫 project-dsh(100) / project-agents(200) / user-dsh(400) / user-agents(500) / bundled(600) 五个 root。这些 root 与 preset 自己的 `customSkillDirs`(300) **在同一个 layer 里**，于是 rank 生效：

> **`<projectRoot>/.dsh/skills/<name>/SKILL.md`（rank 100）会盖掉角色自带的同名 skill（rank 300），而且对**所有**角色同时生效**（每个 preset 算出的是同一个 `projectRoot`）。

**对本命题的意义**：**"硬隔离"只在 preset 之间成立，对共享 project root 不成立。** 往角色私有目录放 skill = 培养那一个角色；往 project root 放 skill = 培养**所有**角色，并且优先级**高于**每个角色的私有 skill。"不同人培养不同分身"在机制上等于"不同人往不同的 preset layer 里放 provider"，而不是"放同一个目录加个角色前缀"。

---

### C. 本仓现状走哪条路

**结论【读到的】：每个角色 preset 都走「自带的 `skill-filesystem` + `customSkillDirs` 指到该 preset 自己的 `skills/` 目录」，运行时从磁盘读，落进该 preset 的 layer。不是 skill-badge，也不是 DSH 的 preset 目录约定。**

（清单为 2026-09-22 当日快照；R2 正在并行增补内容，角色数与 skill 数会变，机制不变。）

- 五个 preset（`ceo`/`cfo`/`coo`/`vp-eng`/`vp-sales`）**各恰好一行**同构的 row（`grep -c dsh-skill-filesystem` 每文件 = 1）：

  ```yaml
  - id: skill-filesystem
    name: '@deepseek-ai/dsh-skill-filesystem'
    config:
      customSkillDirs:
        - !!js "process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))"
  ```

  （ceo、cfo、coo、vp-eng、vp-sales 各一处；行号随 R2 内容变动而漂移，此处不钉行号）
- `baseUrl` 的语义是**组合文件所在目录**：`Include` 会把子树的 `baseUrl` 改写成 composition 的目录（`packages/preset/agent-presets/src/mount.ts:44-50`），所以 `new URL('skills/', baseUrl)` = 该 preset 目录下的 `skills/`。**这与 pack 的安装位置无关**，跟着 preset 目录走。
- **不是打包在 pack 里的 JS**：skill 是磁盘上的 `SKILL.md`，provider 每次 `list()` 重扫目录、每次 `get()` 重读正文（`packages/skill/skill-filesystem/src/index.ts:182-198`、`:206-209`；`docs/subsystems/skills.md:194`）。`lib/` 里只有 host/client 两个 JS 面（`packages/company-pack/src/index.ts` 是空 `apply()`）。
- **不是 `dsh-skill-badge`**：badge 是"注册一个 immutable `bundled` candidate"的**可选**打包 provider，shipped CLI 默认禁用（`docs/subsystems/skills.md:79`）；本仓没有任何行引用它。
- **不是 DSH 的 preset 目录约定**：DSH 对 preset 目录只约定两件事——组合文件名 `agent.cordis.yml`（`packages/preset/agent-presets/src/discovery.ts:37`）和展示元数据 `preset.yml`（同文件 `scanRoot` 里的 `readPresetMetadata`）。`skills/` 是**本仓自己发明的约定**，靠 `customSkillDirs` 显式指过去。
- roster 的发现路径在 `packages/company-pack/cordis.patch.yml`：替换 web-app 出厂 `agent-presets` 行，`roots` 指到 `node_modules/dsh-company-pack/presets/`，`trust: system`。

**两条必须单列的现状事实：**

1. **公司 preset 没有挂 `dsh-agent-instructions`，而 web-app 把 host 面的那一行关掉了。** web-app bundle 的 `- id: agent-instructions` / `disabled: true`（`packages/bundle/web-app/cordis.patch.yml:464-465`），shipped 的 `standard`/`ptc`/`cordis` 三个 preset 各自**补回**了这一行（如 `packages/preset/agent-presets/presets/standard/agent.cordis.yml:31-32`），而本仓**五个**角色 preset 的 row 清单里都没有它（`grep -rn agent-instructions packages/company-pack/` 零命中，2026-09-22 快照）。**【推断，证据充分但未跑】** 公司角色会话**不会**自动加载 `<projectRoot>/AGENTS.md` 链。这意味着 **D7 的"公司手册→全局/project root"这条载体在当前 pack 里没有接线**；角色手册实际只有 persona prefix（写死在组合文件里）+ 会话内 fs 读取两条路。
2. **当前 skill 名全局唯一**（当日快照 12 条：`chairing-staff-meeting` / `tech-feasibility-review` / `eng-workflow` / `market-sizing` / `customer-voice` / `sales-workflow` / `budget-check` / `ops-feasibility` / `ops-workflow` / `cfo-workflow` / `finance-compliance` / `project-economics`），所以同 layer 内的 rank 冲突**目前不发生**——不是机制不允许，是内容还没撞上。

**对本命题的意义**：**当前"培养一个角色"= 改 `packages/company-pack/presets/<role>/` 下的文件**（persona 在 `agent.cordis.yml`，能力在 `skills/`），改完对**新会话**生效（见 E 的 generation 机制）。而"给全公司立一条规矩"目前**没有**可用的自动载体——project root 的 AGENTS.md 链没接线，写进 project root skill 又会盖掉角色私有 skill。

---

### D. 运行时可写性：分身能在自己会话里长出 skill 吗？

**结论【读到的】：能，但唯一可写的 skill root 是跨角色共享的；角色私有 skill 目录写不进去。生效时点是下一轮。**

**（1）位置闸门 = sandbox，可写区 = 会话 cwd + temp。**

- `workspace-write` 的可写根恰好三个：`return [...new Set([policy.workspaceRoot, '/tmp', tmpdir()].map(canonicalPath))]`（`packages/sandbox/sandbox/src/roots.ts:52-55`）。
- `workspaceRoot` 就是会话不可变 cwd：`workspaceRoot: resolveWorkspaceRoot(session?.header.cwd ?? this.workspaceRoot)`（`packages/sandbox/sandbox-policy/src/index.ts:163-170`）。
- 出厂 CLI 把默认钉在 `workspace-write`（`packages/bundle/base/cordis.patch.yml:208-212`，`mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`）。
- 越界即拒绝：`packages/fs/fs-sandbox/src/index.ts:122-144` 抛 `FS_SANDBOX_DENIED`，模型看到 `[sandbox: file access denied under workspace-write mode]`。
- 越界时模型可请求单次升级，但要人类审批：`packages/fs/tool-fs/src/sandbox.ts:87-108`（`approveEscalation`），出厂 permission preset 里 `workspace-write: { sandbox: workspace-write, approval: ask }`（`packages/bundle/base/cordis.patch.yml:229-241`）。

**（2）第二道闸 = 先读后写。** `dsh-fs-observation-policy` 已在 base 挂载（`packages/bundle/base/cordis.patch.yml:257-258`）：改一个已存在的 skill 文件前必须先 `read` 它，否则 `edit` 抛 `FS_NOT_OBSERVED`（`packages/fs/fs-observation-policy/README.md`）。

**（3）把两条闸和 root 表叠起来，结论很硬：**

| 想写的路径 | 在会话 cwd 之下？ | 结果 |
|---|---|---|
| `packages/company-pack/presets/<role>/skills/...`（角色私有） | ✗（在 pack 安装目录） | **`FS_SANDBOX_DENIED`**（除非人类批升级） |
| `<DSH_HOME>/skills/...`（`user-dsh`，rank 400） | ✗（除非 home 恰在 workspace 内） | **`FS_SANDBOX_DENIED`** |
| `<projectRoot>/.dsh/skills/...`（rank 100） | ✓（projectRoot 是 cwd 的祖先） | **可写** |
| `<projectRoot>/.agents/skills/...`（rank 200） | ✓ | **可写** |

注意本仓有个**开发态/日用态的不对称**：`dev/env.sh` 把 `DSH_HOME` 设在仓库内（`dev/harness-home`），于是开发态 `user-dsh` root 落在 workspace 内、可写；日用 `~/.dsh/skills` 在 workspace 外、不可写。**【推断，由 roots.ts:54 的包含判定直接得出】**

**（4）下一轮是否生效：会。** 三条路径都通：

- **工具观察同步失效**：`skill-filesystem` 在 apply 时订阅 `fs/observed`，只认 `edit`/`write` 两个工具名，直接调 `provider.observeHostMutation(...)`（`packages/skill/skill-filesystem/src/index.ts:139-142`、`:693-697`），落到 `:332-337` 的 `this.invalidate()`（前提是该路径在当前已 retain 的 root 之下）。
- **宿主 watcher**：chokidar 覆盖 IDE / Git / shell / 外部进程的改动（`docs/subsystems/skills.md:81`、`packages/skill/skill-filesystem/src/index.ts:488-530`）。
- **失效即清缓存**：`invalidateCache()` 做 `revision += 1` + `collectCache.clear()`（`packages/skill/skill/src/index.ts:623-627`），缓存 key 含 revision，所以下一次读必然重扫。
- **模型可见时点**：`dsh-tool-skill` 在**每个 `agent/pre-step`** 重新 `ctx.skills.snapshot(...)`，对渲染出的条目算 digest，变了才 `agent.inject()` 一条 durable 的全量替换目录（`packages/skill/tool-skill/src/index.ts:213-251`；`docs/subsystems/skills.md:233`）。**正文热改**更直接：注册表不缓存完整定义，每次 `get()` 重读磁盘（`docs/subsystems/skills.md:194`）。
- **会不会影响别的角色：会。** 可写的那两个 root 是**共享**的（project-dsh / project-agents 按 projectRoot 算，与角色无关），且 rank 100/200 高于角色私有的 300。所以"分身自己长出的 skill"对**所有角色**同时生效，还会盖掉角色私有同名 skill。

**（5）顺带确认两条"此路不通"：**

- **`skill` 工具没有创建能力**：它只注册一个只读工具，唯一参数是 `name`（`packages/skill/tool-skill/src/index.ts:81-86`），执行体是 `list()` + `get()`。学习必须走通用 `write`/`edit`。
- **`ctx.skills.register()` 不持久**：存进 `SkillLayer.runtime` 这个进程内 `Map`（`packages/skill/skill/src/index.ts:333`、`:441-462`），随 effect 销毁而删除，全树没有任何持久化路径。它适合"插件内嵌 skill"，不适合"分身自己创建并跨会话保留"。

**对本命题的意义**：**"自我学习落在 skills 上"机制上可行，但落点很别扭。** 分身唯一能自己写的是**全公司共享**的 skill root；它能改自己的**行为**（下一轮就看到），但改不了自己的**私有能力包**（在 workspace 外）。想让"某个角色自己长出的 skill 只属于它自己"，当前机制下**做不到**——除非人类批准一次越界写，或改成每角色一个独立 workspace。

---

### E. persona 的写权：谁有权培养这个分身？

**结论【读到的】：persona 来自 preset 组合文件里的 `dsh-persona` row，在 mount 时注册成 prompt section，运行时没有修改入口。所以"谁有权培养这个分身"在机制上等于"谁能改哪些文件"。**

- **来源**：`dsh-persona` 是 preset 挂载的组合 row，Config 只有四个字段 `prefix`（必填）/ `suffix` / `complete` / `includeRuntimeContext`（`packages/preset/persona/src/index.ts:30-53`），`apply()` 把它们注册成 `deployment:persona-prefix` / `deployment:persona-suffix` 两个 section（同文件 `:62-74`）。它**必须在 preset 里挂**：挂到全局会与 prompt registry 自己的 persona 注册冲突并 fail loud（`packages/preset/persona/README.md`）。本仓每个角色 preset 各写一段 prefix（`packages/company-pack/presets/*/agent.cordis.yml` 的 `persona` row）。
- **运行时不可变**：整个包没有任何暴露给模型或事件的改写入口；它只是注册。改变它只能改**组合文件**。
- **组合文件本身也不是持久化目标**：preset 子树 `override write(): void {}`，loader 的写回被吞掉（`packages/preset/agent-presets/src/mount.ts:117-123`；README：`The preset file is an input, never a persistence target.`）。
- **但模型改文件走的是 fs 工具，不走 loader**：真正的闸是 D 里的 sandbox。pack 装在 profile 的 `node_modules/dsh-company-pack/presets/...`，会话 cwd 是 `company-workspace/` → 不在可写区 → `FS_SANDBOX_DENIED`。**【推断，未跑实证】**
- **变更如何生效**：mount 记录组合文件的 stamp（mtime + size）——`a session that finds the stamp stale starts the next generation, while sessions already joined keep the generation they run on`（`packages/preset/agent-presets/README.md` 的 Design philosophy）。所以**改 `agent.cordis.yml` → 下一个新会话用新人格，不需要重启进程**；已经在跑的会话不变。
- **persona 文本满足日志不变量**：assembled prompt 被渲染成 `system/message` surface 节点入日志（`docs/subsystems/system-prompt.md:44`）。

**对本命题的意义**：**"培养权"的边界是文件系统权限，不是 DSH 的角色系统。** 能写 `packages/company-pack/presets/<role>/` 的人 = 能重新定义这个分身的人（人格、工具面、私有 skill 根）；运行中的分身**不能**改自己的 persona，也**不能**改别的角色的。想让"培养"变成一种被审计、被授权的动作，当前没有原生载体——只能靠"谁有那个目录的写权限"。

---

### F. 自主节奏：分身能自己定期复盘吗？

**结论【读到的】：不能只用现成机制闭合。两条现成节律各缺一块。**

**（1）`goal` + `goal-round-driver`——真正无人自动续轮，但受人类闸门与进程生命周期双重限制。**

- 定位就是同会话：`# Same-session goals`（`docs/subsystems/goal.md:1`）。
- **durable phase 与进程内 activation 是两回事**：`The durable phase answers what happened to the objective. Process-local activation separately answers whether a continuation consumer may start another round.`（`docs/subsystems/goal.md:21`）；`/** Process-local continuation eligibility; never persisted. */`（同文件 `:67`）。
- **能无人续轮**：driver 在 agent 空闲时自己排下一轮——`automatically continues an active goal in the same session while the agent is idle, continuation is armed, and the configured round allowance remains.`（`packages/goal/goal-round-driver/README.md:12`；实现落点 `packages/goal/goal-round-driver/src/index.ts:192` 的 `agent.followup(message)`）。
- **结束于** complete / blocked / pause / clear / round 上限（默认 256，`packages/goal/goal/src/index.ts:244`；触顶自动记 `round-limit` blocker，`packages/goal/goal-round-driver/src/index.ts:166-168`）。
- **人类闸门**：`create_goal` 与 `pause`/`resume` 都调 `requireDirectHuman`（`packages/goal/tool-goal/src/index.ts:223`、`:272`），判定要求 open turn 里有 `source.kind === 'user'` 的 `user/message`（`packages/goal/tool-goal/src/authority.ts:79-83`）。模型**不能**自己 resume 一个 paused goal（`packages/goal/tool-goal/src/index.ts:283`）。
- **重启即失效**：`ctx.on('agent/session-start', ...) → this.setActivation(agent.session, 'disarmed')`（`packages/goal/goal/src/index.ts:255-256`）；README 写死：`Mounting the driver over an existing agent never arms a goal, and after session resume or fork an active goal stays disarmed until an explicit human-authorized resume — the driver never revives work on its own.`（`packages/goal/goal-round-driver/README.md:57`）

**（2）`schedule`——durable 提醒，但只在会话 live 时投递，而且默认没装。**

- 记录是 durably 存在会话日志里的 `schedule/change`；支持 `after` / `at` / `every_seconds`，后者下限 **300 秒**（`packages/schedule/schedule/src/domain.ts:25`、`docs/subsystems/schedule.md:94`）。
- **投递边界**：`session-local means the original Session must be live: no external notification channel or cold-session scheduler exists.`（`docs/subsystems/schedule.md:156`）；`Cold Sessions do no work; reopening one reconstructs timers and makes past targets overdue.`（同文件 `:188`）。README 一句话：`Reminders survive restarts, but delivery requires a live root agent: closed sessions keep reminders overdue until resumed.`（`packages/schedule/schedule/README.md:12`）
- 到期不打断当前 turn，只排队一次 `followup()`（`docs/subsystems/schedule.md:190`；`packages/schedule/schedule/src/runtime.ts:272`，source 是 `{ kind: 'plugin', plugin: 'schedule' }`）。
- **默认不装配**：`dsh-schedule` 在任何 shipped bundle 里都没有行，只在 opt-in overlay（`apps/cli/config/examples/schedule/cordis.yml`）。本仓 pack 也没装。

**（3）跨会话自主性的缺口在哪。**

- **能无人在场起新会话的只有 `webhook`**：它把已认证的外部投递变成 root Session（`docs/subsystems/webhook.md:5`、`:27`），但需要一个外部 HTTP 调用者 + 部署方自写的 rule 模块，且 `no queue, retry, deduplication, execution status, crash replay, Agent-status listener, or completion result`（同文件 `:23`）。
- **接不上循环【推断，证据强】**：webhook 注入的 `user/message` 的 source 是 `kind: 'webhook'`（`packages/webhook/webhook/src/session.ts:152-155`），而 `create_goal` 要求 open turn 里有 `source.kind === 'user'`（`packages/goal/tool-goal/src/authority.ts:82-83`）→ **webhook 起的会话跑得了一轮 prompt，但进不了 goal 自动续跑循环。** "外部事件起会话"与"自动续跑"目前串不起来。
- **能向已存在会话注入 prompt 的通道**都各有前提：`schedule`（需该会话 live）、`session-controller` 的 `prompt` RPC（需浏览器认证，`packages/client/connection/src/rpc-host.ts:98-99`）、`acp`（需外部程序经 stdio 驱动）、`subagent`/`jobs`（只限会话内相邻 agent / 本会话 owner）。**没有任何进程内的 cron/守护进程能在无人、无外部请求时自己起会话或注入消息。**

**（4）`workflow` / `subagent` 是不是别的循环载体？**

- **`workflow` 不是**：它是前台一次扇出后返回——`The run executes in the foreground: this call returns when the whole script finishes.`，脚本环境 `no filesystem, network, timers, or Node.js APIs are provided`（`packages/workflow/tool-workflow/src/index.ts:149`）。事件是 observe-only 的数据快照，订阅者拿不到 `cancel`/`dispose`（`docs/subsystems/workflow.md:120`）。
- **`subagent` 是事件驱动的唤醒，不是时钟驱动**：continuable 后台子代理结算时，runtime 给 durable 直接父发一条 settlement notice，空闲的父因此被唤醒开新 turn（`packages/subagent/subagent/src/continuation-activation.ts:825-834`；`docs/subsystems/subagent.md:202`）。子代理会话 durable、可冷恢复，深度默认 3（`packages/subagent/tool-subagent/src/index.ts:129`）。**但它需要先有人（或某个循环）把它启动起来。**
- **`ralph` 是循环，但前台且需人类点名**：固定脚本 `for (let round = 1; round <= args.maxRounds; round += 1)`（`packages/workflow/tool-ralph/src/index.ts:151`），`Use the ralph tool ONLY when the direct human explicitly asks for a Ralph loop`（同文件 `:408`）。**【推断】** 这是提示词约束（advisory），不是执行期硬闸门——`execute()` 里没有 goal 那样的 `requireDirectHuman` 检查。
- **全树无 cron**：`packages/*/*/src` 里 `cron` 零实现（只出现在注释/文档）；6 处 `setInterval` 全是心跳/轮询/采样，**没有一处能触发模型 turn**。唯一能反复触发模型工作的定时器是 `schedule` 的自重装 `setTimeout`（`packages/schedule/schedule/src/runtime.ts:180`）。

**对本命题的意义**：**"分身自己定期复盘"当前无法只用现成机制闭合。** 短周期（同一个会话里每 ≥5 分钟回灌一次）靠 `schedule` 可以，但要人先把会话开着且 overlay 装上；长周期（会话关着也要醒来）必须补一个**外部调度器**去起会话——而那个会话又进不了 goal 循环。所以"无人值守的公司"在本机制下有一个明确的、可命名的断点：**外部触发与会话内自主续跑之间没有接缝**。

---

### G. 约束核对：model-visible ⟺ logged 对"学习产物"意味着什么

**结论【读到的】：文件类载体经工具调用进日志，满足该不变量；不满足的是"产物本身的历史"。**

- **不变量原文**：`**Model-visible ⟺ logged**: anything that reaches a model request must be reconstructable from the session log; a new model-visible input requires a session event.`（`vendor/dsh/AGENTS.md:111`）；`docs/architecture.md:121` 补充 `a runtime invariant asserts it`。
- **断言怎么实现的**：`packages/core/agent-loop/src/invariant.ts:21-55` 在 `llm/stream` 上把 `options.messages` 与 `session.deriveMessages()` 逐字比对，不一致直接 fail：`llm request for session "…" diverges from the dispatch-time durable derivation (log-reconstruction desync)`（同文件 `:41`）；同时校验 request header（model / temperature / maxTokens / tools）。
- **文件载体走的是 logged 通道**：
  - 写：`tool/call` 是 log-only 事件，载荷含 `arguments: string`（`docs/persistence-catalog.md:931-939`）——`write` 的内容就在里面；`tool/result` 是 surface 事件（同文件 `:996-1010`）。
  - 读：`read` 的结果是 `tool/result`，同样 surface/logged。
  - skill 目录：`agent.inject()` 注入的 durable 全量替换消息，`These catalog messages are session history`（`docs/subsystems/skills.md:233`）。
  - persona / 系统提示：渲染成 `system/message` surface 节点（`docs/subsystems/system-prompt.md:44`；`docs/persistence-catalog.md` 的 `system/message` 条）。
  - `AGENTS.md` 链：首请求注入的 durable 基线消息（`packages/context/agent-instructions/README.md`）。
- **没有哪种"学习"能绕过日志进模型**——只要它经过 loop 组装的请求，就被 invariant 钉住。**真正绕开的是"产物本身"**：一个 journal 文件或 skill 文件在两次读之间被谁改过、改成了什么，**会话日志里没有记录**。日志只记"某会话在某 seq 读到了这个内容"；文件是怎么长成现在这样的，只有"每次修改恰好发生在某个会话的工具调用里"时才可重建。
- 另一半的边界：`ctx.storage.domain` 这类宿主侧持久化对模型不可见（`docs/subsystems/storage.md:5`），因此**不受**该不变量约束——它也就不能当"记忆"用（模型读不到）。

**对本命题的意义**：**不变量保证了"分身看到的每一份学习产物都在日志里"，但保证不了"这份产物是怎么被教出来的"。** 多人/多会话共同培养同一批文件时，没有任何 session log 能重建这段历史。要"培养过程可审计"，就得让每次修改都发生在某个会话里（于是进 `tool/call`），或者另建一份写在外面的变更记录——后者本身就是新机制，超出 DSH 现成载体。

---

## 3. 未决与需实证

以下都**没有执行**，只给最小可跑步骤。前四条直接决定本仓能不能把"培养/学习"做成机制。

**U1（最高优先）skills 热改是否真在下一轮生效——两条 vendor 陈述互相冲突。**
`docs/subsystems/skills.md:81` 说 watcher 覆盖 `direct bundle/flat-entry additions and removals plus direct skill-entry changes`；但 `packages/preset/agent-presets/README.md` 的 Known Limitations 说 `A generation is keyed on the composition file alone — the stamp check notices agent.cordis.yml changing, not an edit to a skill file or asset beside it; those reach new sessions only once the composition file itself moves or the process restarts.` **【推断】** 后者说的可能是 skill 引用的**资源文件**（watcher 明确说 `Resource files below a bundle are not catalog changes.`），而非 `SKILL.md` 本身；但两条都在同一 vendor 树里，必须实证。
最小实证（**不要动 `agent.cordis.yml`**）：
1. `source dev/env.sh`；`pnpm dsh web -- --port 3086 --no-open`。
2. 用 ceo preset 建会话 A，让它 `skill({ name: 'chairing-staff-meeting' })`，记下正文第一行。
3. 直接编辑 `packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md` 的正文（改一行可识别的字）。
4. **同一会话**下一轮再 `skill(...)` → 正文变了吗？
5. **新建会话 B** → 目录/正文变了吗？
三档结论分别对应：同会话即变（watcher 生效）/ 只有新会话变 / 都不变（= 只有改组合文件或重启才变）。

**U2 新建 skill 文件（add）与改已有文件（change）是否同一条路径。**
`isPotentialSkillPath` 只接受深度 ≤2 的 `.md` / `SKILL.md`（`packages/skill/skill-filesystem/src/index.ts:677-684`），且 `observeHostMutation` 只对**当前已 retain 的 root** 生效（`:332-337`）；root 目录本身不存在时的 `fs.watchFile` 逐段探测（`:452-466`）未实证。
最小实证：在已开的 ceo 会话里用 fs 工具在 `<repo>/.dsh/skills/`（不存在则新建）写 `probe-skill/SKILL.md`，看下一轮目录里是否出现 `probe-skill`；再删掉看是否消失。**注意：这会污染全公司共享目录，实证后必须清理。**

**U3 project root（rank 100）是否真的盖过角色私有 skill（rank 300）。**
这是 rank 表的直接推论（`packages/skill/skill/src/index.ts:808-812` 同 layer 内 rank 优先），本仓从未跑过。
最小实证：在 `<repo>/.dsh/skills/market-sizing/SKILL.md` 写一份 description 明显不同的同名 skill，起 vp-sales 会话，看目录里 `market-sizing` 的 description 来自哪一份（rank 100 应赢）。清理同 U2。

**U4 公司角色会话是否真的不加载 `AGENTS.md` 链。**
依据是"web-app 禁了 host 行（`packages/bundle/web-app/cordis.patch.yml:464-465`）+ 公司 preset 没补回"，属**【推断】**。
最小实证：起一个 ceo 会话，让它回答"你的系统提示里有没有出现 `vendor` 铁律 / `pnpm verify` 这类字样"；或直接查该会话日志的首个 `system/message` 事件里是否含本仓 `AGENTS.md` 的片段。

**U5 沙箱对 pack 目录的拒绝是否真如推断。**
依赖"公司会话 cwd = `company-workspace/`"这个本仓设定，且依赖 `isPathUnder` 的具体语义（只读了调用点）。
最小实证：起 ceo 会话（cwd 指到 `company-workspace/`），让它 `edit` 一个 preset 文件的一行，看是否返回 `[sandbox: file access denied under workspace-write mode]`；再让它写 `<repo>/.dsh/skills/` 下同一内容，看是否成功（对照组）。

**U6 公司 preset 下 `goal` / `schedule` 是否真的不可用。**
依据是"公司 preset 没声明 `tool-goal`，而 web-app 把 host 的 `tool-goal` 禁了（`packages/bundle/web-app/cordis.patch.yml:414-415`）"，schedule 则任何 bundle 里都没有。
最小实证：起 ceo 会话，看工具清单里有没有 `create_goal` / `schedule_create`。

**U7 "外部事件起会话"能否接上"自动续跑"。**
webhook 会话的 `create_goal` 会被 `requireDirectHuman` 拒——这是**【推断，证据强但未跑】**。
最小实证：配一个最小 webhook rule（起一个 ceo preset 会话，注入一句 prompt），看该会话里 `create_goal` 是否返回 `GOAL_TOOL_*` 类拒绝。

**U8（次要）`preset.yml` 的 `order` 与 skill 发现无关。** 本仓 `preset.yml` 只写 `name`/`description`/`order`，`scanRoot` 用它做展示与排序（`packages/preset/agent-presets/src/discovery.ts` 的 `readPresetMetadata` 与排序段）。没有疑问，但没跑过"改 order 是否影响任何别的东西"。**【读到的】** 不影响 skill 发现。

---

## 4. 引用清单（primary sources）

**本仓（被研究对象）**

1. `packages/company-pack/presets/{ceo,vp-eng,vp-sales,coo}/agent.cordis.yml`（persona row、skill-filesystem row、工具行）
2. `packages/company-pack/presets/{ceo,vp-eng,vp-sales,coo}/preset.yml`、`packages/company-pack/presets/*/skills/*/SKILL.md`
3. `packages/company-pack/cordis.patch.yml`（agent-presets roots 替换行 + insert 行）
4. `packages/company-pack/src/index.ts`（host 面空壳）、`packages/company-pack/README.md`
5. `dev/company.overlay.yml`、`dev/env.sh`（DSH_HOME 落在仓库内这一事实）

**vendor/dsh 文档（钉 tag `dsh-v0.1.5-rc.2`）**

6. `docs/subsystems/README.md`（子系统索引——证明无 memory 页）
7. `docs/subsystems/skills.md`（分层、rank 表、watcher、目录消息、定义不缓存）
8. `docs/subsystems/scope.md`、`docs/subsystems/system-prompt.md`
9. `docs/subsystems/compaction.md`（证明 compaction 是 surface 减法）
10. `docs/subsystems/persistence.md`、`docs/persistence-catalog.md`（`tool/call` / `tool/result` / `system/message`）
11. `docs/subsystems/storage.md`、`docs/subsystems/workspace.md`（宿主侧持久化对模型不可见）
12. `docs/subsystems/sandbox.md`、`docs/subsystems/filesystem.md`
13. `docs/subsystems/goal.md`、`docs/subsystems/schedule.md`、`docs/subsystems/workflow.md`、`docs/subsystems/subagent.md`、`docs/subsystems/webhook.md`
14. `docs/user/guide/mcp-memory.md`（三方记忆 MCP，默认关闭）
15. `docs/architecture.md:121`、`AGENTS.md:111`（model-visible ⟺ logged）

**vendor/dsh 源码**

16. `packages/skill/skill/src/index.ts`（layer 归档、nearest-wins、rank 比较、runtime 注册、缓存失效）
17. `packages/skill/skill-filesystem/src/index.ts`（Config、roots 组装、rank 常量、`fs/observed` 失效、watcher）
18. `packages/skill/tool-skill/src/index.ts`（目录 pre-step 重算、只读工具契约）
19. `packages/core/scope/src/store.ts`（`ScopedLayers.effect` → `scopeOf(ctx)`）
20. `packages/core/agent-loop/src/invariant.ts`（log-reconstruction 断言）
21. `packages/preset/agent-presets/src/{mount.ts,discovery.ts}`、`packages/preset/agent-presets/README.md`（standing mount、generation、write 抑制、Known Limitations）
22. `packages/preset/persona/src/index.ts`、`packages/preset/persona/README.md`
23. `packages/context/agent-instructions/README.md`
24. `packages/sandbox/sandbox/src/roots.ts`、`packages/sandbox/sandbox-policy/src/index.ts`、`packages/fs/fs-sandbox/src/index.ts`、`packages/fs/tool-fs/src/sandbox.ts`、`packages/fs/fs-observation-policy/README.md`
25. `packages/bundle/base/cordis.patch.yml`、`packages/bundle/web-app/cordis.patch.yml`（host/preset 分面与 disabled 行）
26. `packages/preset/agent-presets/presets/{standard,ptc,cordis}/agent.cordis.yml`（shipped preset 补回 agent-instructions 的对照）
27. `packages/goal/{goal,goal-round-driver,tool-goal}/…`、`packages/schedule/schedule/…`、`packages/workflow/{tool-workflow,tool-ralph}/…`、`packages/subagent/{subagent,tool-subagent}/…`、`packages/webhook/webhook/src/session.ts`、`packages/client/connection/src/rpc-host.ts`

**证据瑕疵与边界**

- 本笔记全部结论以 `vendor/dsh/` 树为准；**日用全局安装（`which dsh`）的行为一概不作依据**，两者版本相同只是巧合。
- 凡标 **【推断】** 的条目（尤其 C 的 agent-instructions 缺失、D/E 的沙箱拒绝、F 的 webhook→goal 断点）都需第 3 节的实证步骤确认后才可当结论引用。
- vendor 树为 pre-stable；规则可能随 pin 漂移，升级 pin 时本笔记需重新核对。
- 子代理产出的两份源码报告（skill-filesystem/写策略、goal/schedule/workflow/subagent 自主性）中的关键行号已由本笔记作者抽查复核；未复核的少数条目已在正文中标注为推断。

---

## 5. 后续修订（2026-09-22，本笔记之后）

> 本节晚于正文。正文是当日的机制快照，**以下四条改写了它的结论**——读 §C / §D / §3 前先读这里。

1. **§C 的两条"前置修复"都已落地**（[../implemented/2026-09-22-skill-root-isolation.md](../implemented/2026-09-22-skill-root-isolation.md)
   与 [implemented/2026-09-22-r2-roles-alive.md](../implemented/2026-09-22-r2-roles-alive.md)）：
   五个 preset 都加了 `includeDefaultRoots: false`；五个 preset 都补回了 `agent-instructions` 行，
   且 `scripts/handbook-smoke.mjs` 已把"会话指令基线 = `company-workspace/AGENTS.md`"做成
   真入口断言。⇒ §C 结尾"给全公司立一条规矩目前没有可用的自动载体"与 **U4 作废**。
2. **U1 已在源码层回答**（同篇末节）：skill 条目的增删改名**下一轮**就刷新（首方 `write`/`edit`
   直接失效 provider），不必等新会话。§3 记的"两条 vendor 陈述冲突"由此收敛；仍缺一次活体探针
   （最小步骤见 [../../docs/plans/r5-plus-readiness.md](../../docs/plans/r5-plus-readiness.md) §3.1）。
3. **§D 的"唯一可写落点"结论被隔离改动推翻**：`includeDefaultRoots: false` 之后，角色 provider
   只扫自己的 `customSkillDirs`，`<projectRoot>/.dsh/skills`（rank 100）**不再进入角色的技能面**
   ⇒ 往那里写 skill 对任何公司角色都不可见。正文 D 的"自我学习落在 skills 上机制上可行，
   但落点很别扭"应改读为**不可行**——这同时让提案里"否决分身运行时自改 skill"从取舍变成机制事实。
4. **U2 / U3 作废，U5–U7 降级**：U3 的 rank-100 覆盖前提是"共享根与角色目录同 layer"，
   隔离后不再成立；U2 的探针会写全公司共享目录，随隔离失去意义——**两条都不要再跑**。
   U4 已闭合；U5 仍只是【推断】但风险低；U6/U7 只服务于已搁置的"自主节律"
   （见 r5-plus-readiness §4），**保留 U7 作上游 seam 的证据引用，不跑**。

**净结论**：本笔记的机制面（A/B/E/F/G）**仍然有效**；失效面只集中在 §C 的两条前置、
§D 的自学习落点、以及 §3 的 U1–U4。R6 的"培养/学习"因此不再缺前置。
