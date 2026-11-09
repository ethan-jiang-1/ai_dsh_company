---
topic: 产品形态
intent: "为「插件即产品：独立 company profile、启动即进入用户 workspace、run bundle 留在 workspace」问题卡提供 FAQ 26 消化、DSH 机制核对、本仓现状与迁移面。"
---

# 插件即产品：profile、workspace 与 run bundle 的边界

> 服务卡：[插件即产品：独立 company profile 与 workspace 自有的 run bundle](../../settled_issues/2026-11-01-plugin-as-product.md)。
> 读法：先读卡「原始意图」，再读本稿；§1–§5 是事实与机制，§6–§8 是方案比较、迁移与验证，不是决定。
> 性质：研究证据，不是决定；拍板项住卡。
> 证据分级：**T** = 本轮实跑；**C** = 当前源码/合同阅读；**P** = 提议，未实现；**U** = 未验证。
> 基线：`vendor/dsh` = `dsh-v0.2.1-rc.2`（`687f282…`）；外部 FAQ 26 的归档基线 = `dsh-v0.2.1-rc.3`（外部历史，不覆盖本仓 pin）。
> 实测环境：本机 macOS，临时 `DSH_HOME` + 临时 workspace；2026-11-01。

## 0. 结论（先看九条）

1. **产品 profile 不是隔离边界，但可以是独立的启动组合**：`dsh --profile company` 读
   `$DSH_HOME/profiles/company/package.json` 的 `dsh.profile.bundles`；要独立数据面仍需独立
   `DSH_HOME`。产品应把 “`company` profile + 独立 home” 一起交付，而不是只换 profile 名。
   （C：`vendor/dsh/apps/cli/README.md`；FAQ 26 `00-answer.md` 结论 1/6）
2. **profile 可以从 shipped web template 建出来**：实测
   `dsh --profile company --from-default-profile web --dump-default-config` 会写出
   `profiles/company/package.json`（bundles = `dsh-base` + `dsh-web-app`，`dependencies` 为空）、
   `cordis.patch.yml`、`cordis.yml`、`pnpm-workspace.yaml`，然后才 dump。之后
   `dsh plugin --profile company add <tgz>` 会把 `dsh-company-pack` 追加进 bundles。**T**
3. **workspace 不是权限，也不是产品目录的自动归属**：它是 Host 侧目录登记，服务导航与 Session
   分组；`workspace.create(path)` 只接受已存在的绝对目录，规范化后登记。Session 的
   `header.cwd` 才是不可变的项目身份，也是 sandbox 的默认根。FAQ 26 反复强调不要把
   Workspace / header.cwd / 有效 working directory / 产品 project root 混成一个根。
   （C：`vendor/dsh/packages/api/workspace-controller/README.md`、
   `vendor/dsh/packages/workspace/workspace/src/index.ts`、FAQ 26 `10-foundations/16-startup-resolution.md`）
4. **DSH Web 的“首用默认 workspace”是产品目录选择的坑**：Client 只有在
   **Workspace 列表为空且没有任何 Session** 时才调用 `workspace.initializeDefault()`；Host 在
   Documents 下建 `deepseek-harness/default-workspace`。产品若在启动时已经登记了用户目录，
   这条首用流程就不会触发；这是“启动就知道 workspace”的关键机制。**C + T**（2026-11-01 已做
   端到端浏览器实测，见 §4.1b）
5. **Workspace 已登记时，Client 会自己选一个 workspace 并建/复用 blank Session**：
   `restoreSelection()` 在没有选中会话时走 `recentWorkspace()` → `connectWorkspace()` →
   `sessions.create({ workspaceId })`；没有显式 preset 时用 Host 默认 preset（本包已把
   `agent-preset-registry.default` 改成 `ceo`）。**T**：2026-11-01 端到端实测——boot 登记
   workspace 后打开浏览器，页面无 “Choose workspace”，当前会话 cwd = target、preset = ceo，
   `session/list` 从 0 变为 1。见 §4.1b。
6. **手册注入只认同目录的候选文件名**：`agent-instructions` 的
   `instructionFileCandidates` 会过滤含 `/` 或 `\` 的值；不能写
   `.dsh-company/AGENTS.md`。所以“既不覆盖用户项目 `AGENTS.md`、又能注入公司手册”的可行做法是
   新增一个同目录候选名（如 `COMPANY.md`），并把 `COMPANY.md` 放进 `instructionFileCandidates`。
   **C / P**
7. **方法层与 skill 目录是 composition-time 的**：`customSkillDirs` / `cultivationRoot` 在
   profile 组合时求值；`!!js` 可以读 `process.env`。因此“workspace 里的方法层”要求启动器在
   **boot 前**把 workspace 决定好并设进环境（`DSH_COMPANY_HOME`）；在浏览器里选的 workspace
   对本次进程的 preset 组合来说太晚。**C / P**
8. **本仓现在的 run bundle 不在 workspace**：`bundle.json` 写 `<DSH_HOME>/bundle.json`，v1 里还有
   `workspace` 字段；默认公司盘是 `<DSH_HOME>/company-workspace`；`DSH_COMPANY_REBIND` 是“一个
   home 只能有一个盘”的补救。这和用户要的“生产状态/产物在用户 workspace”正相反。
   **C**（`src/host/run-bundle/bootstrap.ts`、`src/host/run-bundle/bundle-manifest.ts`、`src/host/run-bundle/runtime-guard.ts`）
9. **这是一次产品形状变更，不是小改**：它同时动 profile 入口、workspace 解析、bundle 身份、
   骨架/手册文件名、方法层/审计账本落点、`README`/`_dist` 手册、6+ 个 smoke 与多道门禁；
   必须按破坏性版本（建议 `0.5.0`）做，并保留 v1 数据的迁移窗口。**P**

## 0.1 自审修订（2026-11-01，晚于 §0 初稿）

上一版研究/卡把三个默认推得太远；自审后撤回，后续 §6 的推荐以本节为准：

| 上一版默认 | 修订后 | 为什么 |
|---|---|---|
| 一个安装可打开多个 workspace | **v1 一安装一 workspace**；换项目 = 新 home + 新 workspace；多 workspace 后置 | 方法层/账本是 host 治理（D25/M2），一 home 多盘会串或要 per-workspace 分区；Client 的 active 选中、lease、产品命令的“当前盘”都会多一层状态；与现行“一次安装 = 一个 run bundle”最接近 |
| 方法层/账本/日志搬 workspace | **方法层/账本留 home**；workspace 只放业务产物 + 只读导出（派生） | D25 的自改否决与 M2 的防篡改都是“模型不能写 host 治理”；搬进 workspace 等于降级为约定。日志可搬；账本/方法层不搬 |
| 手册全量改名 `COMPANY.md` | **碰撞感知 seed**：`AGENTS.md` 优先；已有 `AGENTS.md` 时 seed `COMPANY.md`；presets 候选同时含两者 | 专用盘继续 `AGENTS.md`；已有项目不被覆盖；避免 5 preset + 骨架 + gates + docs 的全量 churn。manifest 记实际 seed 目标 |

另外三条可行性修订：

- **包 `bin` 已被实测**：2026-11-01 用一个小包走 `dsh plugin --profile company add file:<tgz>`，
  `profiles/company/node_modules/.bin/<name>` 被 pnpm 链出且可执行（**T**）。所以“安装形态启动器”
  的包装路径成立；尚未在本包集成。
- **独立 host row 是首选，但需第二个构建入口**：注册 workspace 最好用独立 row
  （`inject: ['workspaceRegistry']` + async apply），这要求 `exports` 增加子路径、tsdown 增加一个
  host entry、`files` 增加产物；主 `apply` 内 `ctx.inject` 会引入 boot 时序竞态。**P，未在本包验证**。
- **`bundle.json` 在 workspace 是模型可写的**：`workspace-write` 下模型能写 `.dsh-company/`；host
  只能校验、fail loud、留 home 恢复备份，不能声称“防篡改”。这是 R4 的固有代价。

**仍未定**：一安装一 workspace 还是多 workspace（Q2）；“生产状态”是否包含方法层/账本（Q3）；
“用户的项目”是专用盘还是任意已有 repo（Q1/Q4）；“询问”是终端还是 Web（Q6 之外的 UX 分叉）；
文档预算的处置。详见服务卡「我们摸透了吗 / 准备透了吗」。

## 1. 用户这次要的产品形状

用户原话（2026-11-01，摘录，完整原话住服务卡）：

> 「我们这个项目其实是要，Develop plug in as a product，其实就是这个插件有一个独立的启动的
> profile，但是启动后，它可以在用户的项目里头，就是要么是用户指定的 workspace 里头去做事情……」
>
> 「这个插件的所有的内容都放在这插件内部，但生产的状态，或者最后的输出物 artifacts，也就是
> 历史上我们说的 run bundle，其实是在用户的 workspace 里……」

把它拆成五个可检验的要求：

| # | 要求 | 判据（产品做完是什么样） |
|---|---|---|
| R1 | 插件是产品，有独立启动 profile | 安装后入口是 `company` profile（不是通用 `web`）；profile 与 pack 一起交付 |
| R2 | 启动时知道 workspace，或启动过程中问 | 启动器先解析/询问 workspace，再 boot；不靠进 Web 后人手加工作区 |
| R3 | 插件内容留在插件内部 | 角色 preset / skills / 客户端 / host 代码只读地住在 pack；workspace 不复制这些定义 |
| R4 | 生产状态/产物在用户 workspace | 公司盘、`bundle.json`、业务产物、日志在 workspace；方法层/审计账本仍是 host 治理（留 home + 只读导出）——Q3 拍板前不把治理搬进模型可写区 |
| R5 | 好 UX | 一次安装可打开项目；首启只补缺、不覆盖；没有“先选 workspace 才能用”的空转；切换项目有清晰路径 |

R3/R4 是分水岭：现在 pack 的 `workspace/` 是**基部骨架**（复制到盘上），不是用户数据；
`bundle.json` 现在是**home 身份**，不是 workspace 身份。产品化不是“把 pack 复制到项目里”，
而是“让 pack 的骨架落到项目里、让项目拥有身份与产物”。

## 2. FAQ 26 的硬结论（外部材料，不是 DSH 合同）

外部研究树 `_faq_on_digested/26_plugin-as-product/` 的核心结论（本节是转述，原文以其 `00-answer.md`
与各基础页为准）：

| 主题 | 结论 | 对本产品的含义 |
|---|---|---|
| Profile | profile 是 DSH 启动组合（ordered bundles + profile/home patch + CLI overlays），不是数据隔离边界 | 产品可以有一个 `company` profile，但必须配独立 home 才谈隔离 |
| 数据卡 | 每份事实分别记录 owner / authority / source / mechanism / scope / readers / writers / rebuildability / retention | 不能给整个产品贴一个“数据类别”；`bundle.json`、方法层、账本、workspace 登记要各写一张卡 |
| Workspace | Workspace 是 Host 侧目录登记；`workspaceId` 不是路径、权限 token 或产品 project ID；`header.cwd` 才是 Session 项目身份 | 产品目录选择要自己拥有，不能把 Workspace 当产品数据库 |
| 首用 | Web 首用默认 Workspace 在 Documents 下；产品自建目录选择、设置文件、隔离路径都不是 DSH 服务 | 不能依赖 `dataRoot/workspace` 之类的“产品默认”；启动器/产品自己决定 |
| 配置 | patch 顺序 = bundle → profile → home → CLI；`config` 整体替换，不深合并；`Config.volatile()` 写回当前 profile patch | 产品设置若跨 profile，要放稳定的产品文件/domain，不要塞 volatile Settings |
| 安装 | `dsh plugin --profile <name> add <bundle>` 只改 profile roster；卸载不删产品数据/项目文件/Session | 安装/升级/卸载说明书必须写清“workspace 保留什么、home 保留什么” |
| Profile 形态 | 八种外部产品形态；四层装配状态（package / roster / row / effective config）要分别读回 | 本包属于“组合包/全家桶”之间的单 bundle 产品；不要只信 `plugin add` 的 exit 0 |
| 产品目录 | 产品项目根、Workspace path、Session cwd、有效 working directory 是四个决定 | 本产品选“workspace 根 = 公司盘根”，不是“DSH Workspace 自动等于公司盘” |

**不是 DSH 合同的部分**：FAQ 26 的 Kanban 例子、八种外部形态、`dataRoot` 之类都是产品设计参考；
DSH 当前行为以 `vendor/dsh` 的源码与 docs 为准。本稿把两者分开标注。

## 3. DSH 机制核对（当前 pin）

### 3.1 profile / 启动

- CLI 只解析自己的 flag，第一个不认识的 token 起交给 app；`dsh web` 是 `--profile web` 的简写。
  （C：`vendor/dsh/apps/cli/README.md`、`apps/cli/src/args.ts`）
- profile 目录 = `package.json`（`dsh.profile.bundles` 有序列表）+ `cordis.patch.yml`（用户层）。
  组合顺序：bundles → profile patch → `$DSH_HOME/cordis.patch.yml` → `--patch`。
  （C：同上；FAQ 26 `10-foundations/17-config-layers.md`）
- 自定义 profile 名不会自动带 `dsh-web-app`：`dsh plugin --profile company add` 在空 home 只会建
  base-only profile，preset 行会 pending。所以产品必须先
  `--from-default-profile web` 再 add，或由启动器写同形状的 profile。**T**（见 §4.1）
- `--from-default-profile` 会**替换**同名 profile 的依赖与用户 patch；启动器只能在 profile
  不存在时调用，不能在已有 profile 上“修复”式调用。**C**（CLI README / FAQ 26 `90-advisor/93`）

### 3.2 workspace / session / cwd

- `dsh` 进程的调用目录是默认 filesystem location；Session Controller 的 `defaultCwd` 是
  `process.cwd()`。但 Web UI 的“新会话”通常先选 workspace，Session 的 cwd 从 workspace path 来。
  （C：`vendor/dsh/packages/api/session-controller/src/index.ts`、`commands.ts`）
- `session.create` 的位置字段二选一：`workspaceId`（Host 从登记取 canonical path 并 attach）或
  `cwd`（只给起始目录，不登记）。两者不能同时传；`header.cwd` 是创建时写死的初始目录。
  （C：`commands.ts`；FAQ 26 `00-answer.md`、`10-foundations/16`）
- `working_directory` 可以改后续相对操作的目录，但**不改** `header.cwd` / Workspace membership /
  sandbox writable roots。**C**（`vendor/dsh/packages/session/working-directory/src/index.ts`；
  FAQ 26 `10-foundations/16`）
- `workspace-write` 的 sandbox 以 Session 根为主根，额外允许平台临时目录；读不受写入 fence 限制；
  Host 插件代码直接写文件不自动受 Session sandbox 约束。**C**（FAQ 26 `00-answer.md`；
  `vendor/dsh/docs/subsystems/sandbox.md`）
- `workspace.create(path)` 要求**已存在的绝对路径**，做 `realpath` 规范化，返回已有登记（同 canonical
  path 不重复）；它不创建目录、不授予模型权限、删除只删登记。
  （C：`vendor/dsh/packages/workspace/workspace/src/index.ts`）
- 首次使用：`initializeDefault()` 只在 Workspace registry 为空且没有 live/persisted Session 时 eligible；
  Host 在 Documents 下解析 `deepseek-harness/default-workspace`，由 registry 创建并登记；它不创建
  Session。**C**（`vendor/dsh/packages/api/workspace-controller/README.md`；
  FAQ 26 `10-foundations/16`）
- Client 的选择逻辑：`restoreSelection()` 在没有保存的选中会话时，先尝试恢复 blank；否则用
  `recentWorkspace()` 选一个 workspace；只有 workspace 列表和 session 列表都为空才
  `initializeDefaultWorkspace()`；有目标就 `connectWorkspace()`（最终 `sessions.create({ workspaceId })`）。
  **C**（`vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts`）
  → 推论：**boot 时先登记 workspace** 可以同时压掉“Documents 默认 workspace”和“空态等用户加
  工作区”；2026-11-01 已做端到端浏览器实测（**T**，见 §4.1b）：自动建出 CEO 会话，cwd = target。

### 3.3 手册 / skill 目录

- `agent-instructions` 的 `instructionFileCandidates` 是**同目录文件名**，含 `/` 或 `\` 的候选会被
  过滤；`projectRootMarkers: []` 时 projectRoot = Session cwd。
  （C：`vendor/dsh/packages/context/agent-instructions/src/config.ts`、`files.ts`）
- web-app 把 base 的 `agent-instructions` 行 `disabled: true`，由各 preset 自己声明；公司五个角色
  preset 现在钉 `maxBytes: 32768`、`projectRootMarkers: []`，靠默认候选 `AGENTS.md` / `CLAUDE.md`
  注入公司手册。**C**（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml`；
  `packages/company-pack/presets/*/agent.cordis.yml`）
- 角色 preset 的 `customSkillDirs` 与 `company-client` 的 `cultivationRoot` 都是
  `!!js` + `baseUrl`（profile 目录）算出的 `<DSH_HOME>/company/methods/<role>/`；composition-time，
  不能在 Session 创建后再改。**C**（`packages/company-pack/presets/ceo/agent.cordis.yml`、
  `packages/company-pack/cordis.patch.yml`）
  → 推论：方法层若要落 workspace，启动器必须在 boot 前设 `DSH_COMPANY_HOME`，preset 里用
  `process.env.DSH_COMPANY_HOME` 拼路径；浏览器里再选 workspace 就来不及。**P**

### 3.4 安装 / 生命周期

- `dsh plugin --profile <name> add <spec>` 在 profile 目录转发 pnpm；成功后把 bundle 追加进
  `dsh.profile.bundles`。它返回 package-manager 结果，不返回 Plugin Manager 的 application result；
  membership 变更后要重启 profile。**C**（vendor CLI README；FAQ 26 `10-foundations/18`）
- 卸载 bundle 只摘依赖与 bundle layer，不删产品数据、用户项目文件、Workspace contents 或 Session
  history；`workspace.delete` 只删登记。**C**（FAQ 26 `00-answer.md`、`10-foundations/15`）
- 真实 npm 发布版 `@deepseek-ai/dsh` 不含 browser 两包；本包 browser 组条件启用。
  **C**（`docs/release.md`；`_dist/安装手册.md`）

## 4. 本仓现状（0.4.6）

### 4.1 实测：`company` profile 能建、能装、能以外部 workspace 启动

```sh
# T1：从 web template 建 company profile，不 boot
DSH_HOME=$T/h node vendor/dsh/apps/cli/lib/bin.js \
  --profile company --from-default-profile web --dump-default-config >/dev/null
# → $T/h/profiles/company/package.json: bundles = [dsh-base, dsh-web-app]

# T2：装当前 tarball，再以外部 workspace 启动
DSH_HOME=$T/h node vendor/dsh/apps/cli/lib/bin.js \
  plugin --profile company add _dist/dsh-company-pack-0.4.6.tgz
DSH_HOME=$T/h DSH_COMPANY_HOME=$T/ws \
  node vendor/dsh/apps/cli/lib/bin.js --profile company -- --port 0 --no-open
```

实测结果：

| 观察 | 结果 |
|---|---|
| profile install | bundles 追加 `dsh-company-pack`；boot 后公司行/骨架生效（安装成功） |
| boot | 打出带 token 的 `dsh web:` URL；无 fatal |
| workspace 落盘 | `$T/ws` 出现 `AGENTS.md`、`README.md`、`kb/`、`templates/`、`deliverables/`、`deliverables-archive/`、`cultivation/` |
| home 身份 | `<home>/bundle.json`（v1）记录 `workspace: "$T/ws"`（外部盘，绝对） |
| home 其他 | `.credentials.yaml`、`company/`（方法层）、`company-pack.lock`、`storages/` |
| 未做 | 本表 T1/T2 不含浏览器；浏览器自动选中/自动会话另测，见 §4.1b |

**结论**：profile 独立 + 外部 workspace 已经“能跑”，但身份与默认落点仍在 home；产品化差的是
“workspace 解析、自动登记、身份搬家、内容归属与说明书”，不是从零造机制。

### 4.1b 端到端 T：boot 登记 → 浏览器 → CEO 会话（2026-11-01）

在 T2 基础上加一个**独立 registrar probe 包**（subpath export + `inject: ['workspaceRegistry']`
+ async `apply`；见 §10.2），与 company pack 一起装进 `company` profile；boot 时设
`DSH_COMPANY_HOME` 与 `PROBE_WORKSPACE` 为同一个临时 workspace。然后：

1. **boot 前** `session/list`：`{"items":[]}`（0 会话）。
2. 用 Playwright 打开 token URL，等待 ~9s。
3. **页面**：body 含 `DSH 梦之队`、`梦之队 CEO`、workspace `ws`；**不含** `Choose workspace`；
   console/pageerror 零。
4. **boot 后** `session/list`：1 条 session，`cwd = <temp>/ws`，
   `projections.values.agentPreset = ceo`。

结论：**“boot 时登记 workspace → Web 首屏自动选中 → 默认 ceo 会话”这条链在真浏览器里成立**
（T）。未覆盖：seed/consent、真实模型调用、多 workspace、刷新后的复用；registrar 目前是探针包，
尚未集成进本包。这个 T 直接支撑伞卡验收 #2/#3 与生命周期卡首启段。

### 4.2 当前数据落点（哪些搬、哪些留）

| 事实 | 现在住哪 | 目标 / 说明 |
|---|---|---|
| `bundle.json`（v1，含 `workspace`） | `<DSH_HOME>/bundle.json` | 搬到 `<workspace>/.dsh-company/bundle.json`（v2）；换盘不再需要 rebind |
| 公司盘骨架 | 默认 `<DSH_HOME>/company-workspace`；`DSH_COMPANY_HOME` 可外置 | 保留“可外置”，但产品入口必须显式解析 workspace；默认不再落 home |
| 公司产物（kb/deliverables/cultivation） | 公司盘根 | 位置本身对；产品入口负责把盘指到用户 workspace |
| 方法层 | `<DSH_HOME>/company/methods/<role>/` | **留 home**（D25 自改否决）；workspace 只读导出；不搬 |
| presented 审计账本 | `<DSH_HOME>/storages/company_deliverables.json`（domain） | **留 home**（M2 防篡改）；workspace 只读导出；不搬 |
| 升级日志 / client 错误日志 | `<DSH_HOME>/logs/` | 升级日志搬 `<workspace>/.dsh-company/logs/`；client 错误日志可留 home |
| writer lease | `<DSH_HOME>/company-pack.lock` | 运行时锁，留 home |
| Workspace 登记 | `<DSH_HOME>/storages/workspace.json` | DSH 的账，不归产品；搬 home 不自动迁移 |
| Session / 凭据 | `<DSH_HOME>/sessions/`、`.credentials.yaml` | DSH 运行时，留 home |
| 产品入口 | 文档叫 `web` profile；`standalone` 也建 `web` | 换 `company` 产品入口；`web` 退为通用/旧部署 |
| 分发手册 | `_dist/安装手册.md` 教“一个 home 一个 bundle、公司盘在 home、侧栏手工加工作区” | 重写：company profile、workspace 参数/询问、workspace 业务备份 + home 治理导出 |

证据：`docs/data-model.md`、`docs/runtime-map.md §二·五`、`docs/profile.md`、`packages/company-pack/README.md` Data 节、
`run/README.md`、`_dist/安装手册.md`。

### 4.3 当前 `bundle.json` / rebind 的行为

`src/host/run-bundle/bundle-manifest.ts` 的 v1：

```json
{
  "v": 1,
  "id": "bundle-…",
  "createdAt": "…",
  "pack": { "name": "dsh-company-pack", "version": "0.4.6" },
  "workspace": "/abs/path/to/workspace",
  "skeleton": { "version": "0.4.6", "files": { "AGENTS.md": "sha256…" } }
}
```

- 只创建、不覆盖；首建用临时文件 + hard link 发布；升级逐文件哈希判定（缺失补建、未改替换、改过保留）。
- 已有 manifest 时改 `DSH_COMPANY_HOME` 默认**硬阻断**（不写新盘）；只有
  `DSH_COMPANY_REBIND=1` + 旧盘已不存在 + 新盘形状正确时，备份 manifest、改写 workspace、记日志。
- 这些复杂度全部来自“workspace 指针在 home 的身份里”。把 `bundle.json` 放进 workspace 后，
  “home 指向哪个盘”这个问题本身消失，rebind 可以退役。

## 5. 目标四空间与数据卡

### 5.1 四个空间（不是四个 DSH API）

```text
插件包（只读产品内容）     presets / skills / client / host / 出厂骨架
产品安装（DSH 运行时）     DSH_HOME + company profile + sessions / credentials / registry / lease
公司 workspace（run bundle）用户选定目录 + 公司盘 + .dsh-company/（身份、方法层、账本、日志）
验证证据（仓库）           snapshots/ 等冻结证据；不是产品运行态
```

### 5.2 数据卡（每份事实单独写）

| 事实 | Owner | Authority | 目标位置 | Readers / Writers | 可重建 / 保留 |
|---|---|---|---|---|---|
| 插件定义（preset / skill / client / host） | 维护者 | pack 文件 | `packages/company-pack/**`（安装副本只读） | loader / 浏览器；维护者发布 | 随包版本；用户不改 |
| 出厂骨架（手册 / 章程 / 模板 / org） | 维护者 | pack 的 `workspace/**` | pack 内真源；seed 到 workspace（`AGENTS.md` 优先，碰名时 `COMPANY.md`） | host 首启/升级；用户可改 | 哈希判定；改过保留 |
| 公司身份与长期 KB | 用户 | workspace 文件 | `<workspace>/AGENTS.md`（或 `COMPANY.md`）、`kb/**` | 角色 fs / 用户 | 用户备份；升级不覆盖 |
| 交付物 | 用户 / CEO | workspace 文件 | `<workspace>/deliverables/**` | 角色 fs / 用户 / client | 用户备份；present 账本记 true |
| 培养记录 | 公司 / 角色 | workspace 记录文件 | `<workspace>/cultivation/records/**` | 模型 propose / 人命令 | 跟 workspace；archive/purge |
| 方法层 | 部署者 / 角色 | **home 记录**（D25 保护） | `<DSH_HOME>/company/methods/<role>/**`；workspace `exports/methods/` 是派生快照 | 人 `/cultivation adopt`；preset skill loader | 跟 home；workspace 导出可携带 |
| `bundle.json`（run bundle 身份） | 插件 | workspace manifest（host-owned 约定） | `<workspace>/.dsh-company/bundle.json` | host / 人只读 | 只创建；升级改；v2；home 留恢复备份 |
| 基部升级日志 | 插件 | workspace 日志 | `<workspace>/.dsh-company/logs/upgrade.log` | host append / 用户 | 跟 workspace；轮转 |
| presented 审计账本 | 操作员 / 本次交付 | **home domain**（M2 保护） | `<DSH_HOME>/storages/company_deliverables.json`；workspace `exports/ledger.json` 是派生快照 | host 事件 + 人命令；模型不可写 domain | 跟 home；workspace 导出可携带 |
| 治理导出（methods/ledger） | 插件 | 无（derived） | `<workspace>/.dsh-company/exports/**` | 用户 / 备份 | 可重建；不是第二权威 |
| writer lease | 进程 / 这个 home | 进程 | `<DSH_HOME>/company-pack.lock` | host | 进程持有；stale 接管 |
| DSH workspace 登记 | DSH / 这台机器 | DSH | `<DSH_HOME>/storages/workspace.json` | host / client | DSH 所有；搬 home 需重加 |
| Session / present 事件 | DSH | session log | `<DSH_HOME>/sessions/` | 模型 / client | 无删除 API；不删 |
| 凭据 | 用户 / home | provider | `<DSH_HOME>/.credentials.yaml` / env | 用户 | 永不进 workspace / 备份共享 |
| 浏览器状态 | 设备 / origin | client | localStorage | 浏览器 | 换 origin 即丢；不参与模型 |
| 产品设置（当前 workspace） | 插件 | 产品设置文件 | `<DSH_HOME>/company/settings.json`（建议） | launcher / host | home 级便利，不是业务权威 |

**关键取舍（修订后）**：业务产物（公司盘、`bundle.json`、日志、交付物、培养记录）进 workspace，
业务备份 ≈ workspace 一个目录；**host 治理**（方法层、presented 账本、sessions、凭据、登记、lease）
留 home，另写只读导出到 workspace 以便携带。这样不反转 D25/M2 的保护；代价是“业务备份”仍需
带上 home 里的 methods/domain（或先导入导出）。`bundle.json` 在 workspace 是模型可写的，host 只能
校验 + 恢复备份，不能声称防篡改。

## 6. 方案取舍

### 6.1 workspace 布局：根盘 + `.dsh-company/` 元数据（推荐）

| 方案 | 内容 | 优点 | 代价 | 结论 |
|---|---|---|---|---|
| **A 根盘 + 隐藏元数据**（推荐） | 手册（`AGENTS.md`，碰名时 `COMPANY.md`）、`kb/`、`templates/`、`deliverables/`、`cultivation/` 在 workspace 根；`.dsh-company/` 放身份/日志/导出 | 保留现有角色路径与手册引用；产物可见；`bundle.json` 不污染根 | 在已有项目里会新增根目录/文件；需 seed 计划与只补缺 | **推荐** |
| B 全部嵌套 `.dsh-company/` | 所有公司内容在 `.dsh-company/`；根只留指针 | 对已有项目最干净 | 160+ 处 `kb/`/`deliverables/` 路径改写；交付物难发现；手册注入要额外机制 | 不选（本轮） |
| C 可见 `company/` | 同 B 但用可见目录 | 可发现 | 可能与用户已有 `company/` 撞名；仍要改路径 | 不选 |

A 的非侵入承诺：**只补缺、绝不覆盖**；首启前由启动器打印“将创建哪些件”，用户确认；
已有 `AGENTS.md` 保留；手册 seed 目标按碰撞感知（`AGENTS.md` 优先，已存在则 `COMPANY.md`）。

### 6.2 产品入口：`company` profile + 启动器（推荐）

| 方案 | 形状 | 评价 |
|---|---|---|
| **A 独立 `company` profile + `pnpm company` / `dsh-company` 启动器**（推荐） | 启动器建/修 profile、解析 workspace、设 `DSH_HOME`/`DSH_COMPANY_HOME`、spawn `dsh --profile company` | 满足 R1/R2/R5；profile 与 pack 都可测；启动器只做 bootstrap，不复制 DSH 机制 |
| B 只写文档，用户手敲 `DSH_HOME=… DSH_COMPANY_HOME=… dsh --profile company` | 无启动器 | 能跑，但“询问 workspace / 首启 seed 确认 / 最近 workspace”都做不到，UX 不达标 |
| C 浏览器 onboarding 选目录 | Web 内选，Host 写设置 | 最接近 SaaS，但 host boot 不能等；方法层 composition-time 已过；需要自定义 client 与 Host remote，工作量大于本轮 |
| D 换表层/自带运行时 | 独立应用 | 超出 DSH profile 产品形态；FAQ 26 的 34 号也把独立应用另列 |

本轮选 A；C 可作为后续“多 workspace 选择器”增量，不阻塞 A。

### 6.3 workspace 解析：boot 前定，不在 host 里等（推荐）

优先级建议：

1. `--workspace <dir>`（启动器参数，最高）；
2. `DSH_COMPANY_HOME`（环境；直接 `dsh --profile company` 的用户/CI）；
3. `<DSH_HOME>/company/settings.json` 的最近 workspace（启动器写的便利设置）；
4. 交互式询问（TTY；打印绝对路径、是否新建、seed 计划）；
5. 无 TTY 且无值：fail loud，给出两条可执行命令；不猜、不建。

Host 侧只认 `DSH_COMPANY_HOME`（启动器负责 1/3/4），缺省时**不写盘、不 seed、不登记**，
并打出“用 `pnpm company --workspace` 或设 `DSH_COMPANY_HOME`”的可操作告警。这避免
`dsh --profile company` 在任意 cwd 下把公司盘落进随机目录，也避免 Web 首用默认 Documents
被误当产品盘。

### 6.4 一个安装 vs 一个 workspace

| 方案 | 评价 |
|---|---|
| **一个 home 只服务一个 workspace**（v1 推荐） | 隔离最干净；方法层/账本留 home 即“每公司一份”，不需要 per-workspace 分区；sessions/凭据/登记/lease 与公司一一对应；与现行“一次安装 = 一个 run bundle”最接近。换项目 = 启动器新建 home + workspace，pack 重装一次（可自动化，包不大） |
| 一个安装可打开多个 workspace，同一进程一个 active | 产品 UX 更好，但方法层/账本若留 home 会串公司；若搬 workspace 又反转 D25/M2；Client active 选中、lease、产品命令的“当前盘”都要新增状态。后置，不在 v1 |
| 同 home 多 workspace 且方法层/账本按 bundle id 分区 | 理论可行，但 domain 分区/迁移/Client 切换/lease 全要新设计；复杂度不划算 |

推荐 v1 前者；多 workspace 作为后续产品增量（需要 per-workspace 治理 + Client 切换器）。
这与“一次安装”不矛盾：一次安装 = 一个公司/项目；换项目 = 启动器开新 home，不是复用旧 home 的第二盘。

### 6.5 公司手册：碰撞感知 seed（推荐）

| 方案 | 评价 |
|---|---|
| **A 源继续 `AGENTS.md`；seed 时已有 `AGENTS.md` 则写 `COMPANY.md`；候选 `['AGENTS.md','COMPANY.md','CLAUDE.md']`**（推荐） | 专用盘继续 `AGENTS.md`；已有项目不被覆盖；公司手册总能注入；避免全量改名/gates churn |
| B 全量改名 `COMPANY.md` | 单一名字更干净，但 5 preset + 骨架 + `handbook-budget`/`company-skeleton`/`shipped-links`/`handbook-smoke`/README/docs 全要改；旧盘还要迁移双份 |
| C 继续只用 `AGENTS.md` | 已有项目会被跳过（只补缺），公司手册静默不注入；或覆盖用户文件，不可接受 |
| D Host 自建 context 注入 | 可做，但要自己实现 agent.inject 的 source/去重/预算/刷新；不如复用 agent-instructions |

代价：host seed 要按碰撞选目标；manifest 记实际 seed 目标；presets 候选加一项；`handbook-smoke`
覆盖两种目标。旧盘的 `AGENTS.md` 不动；若它是未改过的旧基部手册，可考虑迁移时重命名为
`COMPANY.md`（哈希匹配才做），否则保留并补建 `COMPANY.md`。

### 6.6 方法层 / 审计账本：留 host 保护区（推荐）

| 方案 | 优点 | 缺点 |
|---|---|---|
| **A 留 home**（v1 推荐） | 保住 D25 自改否决与 M2 防篡改；一 home 一 workspace 时天然每公司一份；无需 per-workspace 分区 | “业务备份 = workspace 一个目录”不成立；需把 home 的 methods/domain 一起备份，或写只读导出 |
| B 搬 workspace | 备份/迁移一个目录；符合“生产状态都在 workspace”的字面 | 模型在 `workspace-write` 下可写；反转两条已立决定；`danger-full-access` 下更无边界 |
| C 留 home + workspace 只读导出 | 保护不降级；导出可携带/可读 | 导出是派生，不是第二权威；恢复要导入 home，不能直接靠 workspace 跑 |

推荐 A + C 的导出；若用户要求“全部生产状态在 workspace”，选 B 前必须另立安全机制
（签名/host-only 读写/审批），不能在本卡偷渡。

### 6.7 首启 seed：启动器确认，Host 只执行（推荐）

- 启动器扫 pack 的 `workspace/`，算出“将创建”的件与“已存在跳过”的件，打印摘要，问 y/N；
  `--yes` 用于 CI/非交互；不确认不写。
- 确认后启动器写 `.dsh-company/.seed-consent`（pack 版本 + 计划哈希 + 实际手册目标），
  Host 只在有 consent 或 workspace 已有公司标记（`AGENTS.md`/`COMPANY.md`/`kb/company.md`）时 seed。
- 直接 `dsh --profile company` 且无 consent：只告警、不 seed、不写身份；避免“随便一个 cwd 就被
  变成公司盘”。
- 已初始化的盘再次启动：识别标记，正常升级基部，不再询问。

### 6.8 迁移与兼容

- **版本**：`0.5.0`（破坏性；bundle v2、路径、profile 入口、手册）。
- **v1 → v2 manifest**：`<DSH_HOME>/bundle.json`（v1）→ `<workspace>/.dsh-company/bundle.json`（v2，
  去掉 `workspace` 字段；保留 `id`/`createdAt`/`pack`/`skeleton`）。仅当旧 manifest 记录的
  workspace 与当前解析的 workspace canonical 相同才迁移；旧文件保留为 `.migrated` 或原样不动，
  启动器/文档说明。不同 workspace 的旧 home manifest 不再参与新模型。
- **rebind**：`DSH_COMPANY_REBIND` 退役；启动时若设置，打“已不需要；manifest 现在跟 workspace 走”
  的警告，不执行旧逻辑。`bundle.json.bak-*` 旧备份留 home，不自动删。
- **方法层 / 账本**：保持 home；workspace `.dsh-company/exports/` 写只读快照（派生）。
  不把权威搬进 workspace；旧 `storages/company_deliverables.json` / `company/methods` 原样保留。
- **旧 `AGENTS.md`**：seed 目标碰撞感知；已有项目保留 `AGENTS.md` 并补 `COMPANY.md`；专用盘继续
  `AGENTS.md`；手册候选同时含两者，内容重复时 agent-instructions 按 trimmed 内容去重（C）。
- **旧 `web` profile**：仍可作为普通 DSH profile 装 pack（兼容），但不再是产品入口；文档
  把 `web` 标为“通用 DSH 面/旧部署”，`company` 标为“产品入口”。
- **dev 形状**：`run/env.sh` + `company-workspace/` 继续作为维护者 dev workspace；`bundle.json`
  移到 `company-workspace/.dsh-company/`；dev 盘是专用盘，手册继续 `AGENTS.md`，不改名。

## 7. 影响面（实现时要动的家）

### 7.1 代码 / 数据面

- `src/host/run-bundle/bootstrap.ts`：默认落点去掉 `<DSH_HOME>/company-workspace`；`resolveCompanyHome` 只认
  显式 env；seed consent；手册 seed 目标碰撞感知（`AGENTS.md` 优先，已存在则 `COMPANY.md`）。
- `src/host/run-bundle/bundle-manifest.ts`：v2 + workspace 路径；删 `workspaceRecord` / rebind 计划/执行；
  `bundleManifestPath(workspace)`；升级日志路径；v1 迁移；记录实际手册目标。
- `src/host/run-bundle/runtime-guard.ts`：不再 resolve/rebind home 盘；读 workspace manifest；`dataBlocked`
  覆盖“无 workspace / 无 consent / manifest 坏 / lease 败”；保留多 profile 体检。
- `src/index.ts`：bootstrap/manifest/catalog 调用改 workspace；注册 workspace（新 host row）；
  治理导出（methods/ledger 只读快照）；**不**把方法层/账本搬家。
- `src/host/ledger/presented-domain.ts` / `catalog.ts`：账本保持 home domain（M2）；新增只读导出；
  不改权威路径。
- `src/host/cultivation/cultivation-storage.ts` / `presets/*`：方法层保持 `<home>/company/methods`；
  `customSkillDirs` 不改 env；只新增导出/备份；无需 composition-time workspace 路径。
- `src/host/register-workspace.ts`（新）：boot 时 `workspaceRegistry.create(path)`；失败只告警；
  必须在 Web readiness 前完成（独立 row，`inject: ['workspaceRegistry']`，async apply）。
- `src/host/seed-consent.ts`（新或并入 bootstrap）：consent/marker 判定。
- `packages/company-pack/package.json`：`bin`、`files`、`exports`、第二 host entry；版本 0.5.0。
- `packages/company-pack/cordis.patch.yml`：注册 row、`cultivationRoot` 保持现状（不搬）。
- `packages/company-pack/presets/*/agent.cordis.yml`：`instructionFileCandidates` 加
  `COMPANY.md`（碰撞感知）；`customSkillDirs` 保持 home。
- `packages/company-pack/content/AGENTS.md`：**不改名**；文档补充“已有项目里的 seed 目标可能
  是 `COMPANY.md`”。

### 7.2 启动器 / 工具

- 计划新增 tools/company.mjs（或从 `tools/standalone.mjs` 演进）：`--home`/`--workspace`/`--profile`/
  `--port`/`--no-open`/`--yes`/`--reset`/`--no-build`/`--help`；建 profile、装 pack、解析 workspace、
  seed 计划、设 env、spawn `dsh --profile company`。**只建缺失 profile；已有只验证/拒绝，不 reset。**
- 计划新增 packages/company-pack/bin/dsh-company.mjs：安装形状的同功能入口（`dsh plugin` 会链到
  `profiles/company/node_modules/.bin/`；**T 已证 bin 链接**）；repo 形态可复用同一模块。
- `tools/standalone.mjs`：退役或改为 `company` 的 dev 别名；保留 `--reset` 的安全规则。
- `tools/bundle-init.mjs`：dev workspace 的 `AGENTS.md` 链接保持不变；`.dsh-company` 说明。
- `tools/export-dist.mjs`：手册模板重写；tarball 清单加 `bin/`。
- `tools/release.mjs`：manifest 条目/版本。
- `run/env.sh` / `run/README.md`：dev profile `company`、workspace 路径、bundle.json 新家。

### 7.3 门禁 / smoke / tests

- 门禁：`dist-manual`（新关键句，去旧 `company-workspace`/rebind 断言）、`company-skeleton`
  （源仍是 `AGENTS.md`；加碰撞 seed 断言）、`handbook-budget`（读 `AGENTS.md`；两种目标同字节）、
  `shipped-links`/`base-clean`/`security-scan`（路径）、`run-bundle-clean`（`.dsh-company` 不进 git）、
  `layout-block`/`bare-path`/`md-links`/`md-utf8`/`doc-budget`（文档路径与预算）、`runtime-layout` spec、
  `pack-engines`/`pack-exports`（bin + 第二 host entry）。
- smoke：`release-smoke`（company profile、外部 workspace、注册、v2 manifest、无 home bundle、
  二启稳定）、`external-workspace-smoke`（改新形状；搬 home 不再需要 rebind）、
  `lifecycle-smoke`（v1→v2、升级/卸载/workspace 保留）、`isolation-matrix-smoke`（去 rebind，
  加“无 workspace 停写”）、`multi-install-smoke`、`concurrent-home-smoke`、
  `standalone-smoke`→`company-entry-smoke`（或保留改名）、`client-load-smoke`（浏览器打开即
  目标 workspace / CEO 会话）、`present-catalog-smoke`（账本仍 home，导出在场）。
- 新 keyless spec：workspace 解析优先级；consent 判定；v1→v2 manifest；registrar stub；
  手册碰撞目标；治理导出；seed 只补缺；一 home 一 workspace 拒绝第二盘。
- 每个新门禁/判据要有红→还原→绿证据；smoke 只证真实入口，不冒充浏览器全交互。

### 7.4 文档 / 分发面（用户点名必须一起改）

| 文件 | 要改什么 |
|---|---|
| `README.md` | 产品入口 `company` profile、启动器、workspace 选择、run bundle 在 workspace、home = DSH 运行时 + host 治理；安装/首启/数据三层摘要 |
| `AGENTS.md` | 布局块（`bin/`、`company-workspace` 说明）、命令表（`pnpm company`、`--profile company`）、vendor/安装指针 |
| `_dist/安装手册.md` | 由 `export-dist` 重写：product home、company profile、workspace 参数/询问、v2 bundle、无 rebind、workspace 业务备份 + home 治理导出、卸载保留 workspace |
| `packages/company-pack/README.md` | Install/Config/Data/Backup/Uninstall 全部换新形状；`DSH_COMPANY_HOME` 必填；方法层/账本留 home + 导出 |
| `packages/company-pack/content/README.md` | 用户 workspace 说明：run bundle 在此、手册目标（`AGENTS.md`/`COMPANY.md` 碰撞）、`.dsh-company/`、备份/迁移 |
| 手册目标（`AGENTS.md` 优先；已有则 `COMPANY.md`） | 不改 pack 源文件名；文档写清碰撞 seed 与两份并存时的加载顺序 |
| `docs/profile.md` | 部署形状：产品安装（company profile + 独立 home/一 workspace）、dev 形状、standalone 退役/别名；`web` 不再是产品入口 |
| `docs/runtime-map.md` | run bundle 重定义（workspace + `.dsh-company/bundle.json` + 公司盘）；home = DSH 运行时 + host 治理；首启/登记/选择时序 |
| `docs/data-model.md` | 数据卡逐行换路径；v2；方法层/账本留 home + 只读导出；迁移；`bundle.json` 可写边界 |
| `docs/release.md` | 发布形状、手册、smoke 矩阵、版本 0.5.0、rebind 退役 |
| `docs/project-map.md` | 目录/入口/数据落点；`company-workspace` 说明；`bin/` |
| `docs/guides/bootstrap.md` | 先选形状表：产品安装 vs dev；命令换 `company`；workspace 解析；`pnpm company` |
| `docs/demo.md` | 启动口令、workspace 已自动登记、CEO 会话；删“手点 Edit path 加工作区”主路径 |
| `docs/guides/environments.md` | 双 home；产品 home vs dev home；workspace 不在 home；凭据/端口 |
| `docs/guides/release-runbook.md` | 导出/手册/校验；新 smoke |
| `docs/index.md` / `docs/decisions.md` / `docs/external-research.md` | 登记本 Card/研究；加 D51（产品形状）；FAQ 26 `plugin-as-product` 吸收落点 |
| `docs/orient.md` / `docs/multi-human.md` / `docs/presets.md` / `docs/delegation.md` / design 篇 | 清掉“home 公司盘 / 一个 home 一个 bundle / 侧栏手工加”的旧叙述，留指针；doc-budget 超限先搬后压 |
| 全仓 stale-reference 清扫 | `rg 'company-workspace|bundle\.json|DSH_COMPANY_REBIND|--profile web|一个 home 一个 bundle|侧栏.*工作区'`：现行合同改、历史 Note 加取代 banner、归档不动 |
| `doc-budget` | 现有余量很小（data-model 75/76、profile 63/66）；新增内容优先搬旧形状到 notes/archived + 链接，确需提额按 docs/AGENTS 规则写 Note |
| `run/README.md` / `runtime/README.md` | bundle.json 新家；`.dsh-company`；runtime 只留 home |
| `tests/README.md` / `checks/README.md` | 新 smoke/spec 的改动面映射与索引 |
| `CHANGELOG.md` | 0.5.0 破坏性说明 + 迁移 |
| `.agents/skills/web-window-ops/SKILL.md` | 启动口令/ profile / workspace 步骤换新 |
| `notes/` | 新 RFC/Note；D45/D48 旧 Note 加取代 banner（历史不回填） |

## 8. 验证与证据计划

### 8.1 已跑（T）

- `DSH_HOME=$T/h dsh --profile company --from-default-profile web --dump-default-config`
  → profile 建立，bundles = base + web-app。
- `dsh plugin --profile company add _dist/dsh-company-pack-0.4.6.tgz` → bundles 追加 pack；
  启动 `--profile company` + 外部 `DSH_COMPANY_HOME` → banner、骨架落盘、`<home>/bundle.json`
  v1 记录外部 workspace。证明“profile + 外部盘”机制可用，但身份仍错位。
- `dsh plugin` 会把包 `bin` 链到 `profiles/company/node_modules/.bin/`（2026-11-01 用小包
  `dsh-bin-probe` 实测，`bin` 可执行）——安装形态启动器的包装路径成立（**T**）。
- **boot 时登记 workspace 的独立 host row 已验证**（2026-11-01，探针包）：包 `exports` 暴露
  `./register`，`register.js` 导出 `inject = ['workspaceRegistry']` + async `apply` 调
  `ctx.workspaceRegistry.create(path)`；bundle patch insert 该 row；装进 `company` profile 后
  boot，输出 `[probe] registered <id> <path>` **在** `dsh web:` 之前，
  `<home>/storages/workspace.json` 的 `tables.workspaces` 含该 path。证明“subpath export +
  独立 row + inject 等就绪 + async apply 早于 Web readiness”这条链可行（**T**）。
- **端到端浏览器 T**（2026-11-01）：同一临时 home 装 registrar probe + company pack 0.4.6，
  boot 后 `session/list` 0；Playwright 打开 token URL 后页面无 `Choose workspace`、body 含
  `DSH 梦之队` / `梦之队 CEO` / workspace，console 零 error；`session/list` 变 1 条，cwd =
  workspace、`agentPreset = ceo`。证明“boot 登记 → 自动选中 → CEO 会话”成立（**T**）。

### 8.2 待跑（实现后，按切片）

1. **产品入口**：临时 `HOME` + `DSH_HOME`；`pnpm company --workspace <tmp>` → profile 建立、
   tarball/link 安装、banner、`workspaceRegistry` 含目标路径、无 Documents 默认 workspace、
   无 `<home>/bundle.json`、`<workspace>/.dsh-company/bundle.json` v2、二启字节稳定。
2. **自动进入**：Playwright 打开 token URL → 侧栏/当前会话 cwd = target；单 workspace 时
   CEO 会话出现（或至少 composer 可用）；零 console error。
3. **无参/无 workspace**：`company` 无 TTY、无参 → 非零退出 + 两条可执行命令；Host 直接
   `dsh --profile company` 无 env → 不写盘、不 seed、告警。
4. **只补缺/consent**：已有 `AGENTS.md` / `COMPANY.md` / `kb` 的 workspace → 计划全 skip；
   未确认时零写；确认后只建缺件。
5. **方法层/账本（Q3 默认）**：adopt 仍在 `<home>/company/methods`；present 仍在
   `<home>/storages/company_deliverables.json`；workspace `.dsh-company/exports/` 有只读快照；
   权威不搬。
6. **v1→v2**：旧 home bundle v1 + 旧 workspace → 迁移到 workspace v2（id/createdAt 保留）；
   `DSH_COMPANY_REBIND` 只告警；旧盘仍可用。
7. **一安装一 workspace**：同一 home 再传第二个 `--workspace` → 启动器拒绝/提示新 home；
   session cwd 与登记一致；不会静默塞第二盘。
8. **升级/卸载**：v2 tarball 升 v3（基部哈希；改过的保留）；卸载 pack 后 workspace 数据完整；
   方法层/账本仍在 home。
9. **文档门禁**：`dist-manual` 新关键句；`README`/手册无“一个 home 一个 bundle”“侧栏手工加”
   的产品主路径；手册碰撞目标预算门禁；`md-links`/`doc-budget` 全绿。

### 8.3 红/绿证据

每个新门禁/判据按仓规造红→还原→绿，并在实现 Note 记录原话；不能只报告“verify 绿”。
真实入口 smoke（release/lifecycle/company-entry/client-load）是认证档，不替代 `pnpm test`。

## 9. 风险与未决

| # | 风险 / 未决 | 处置建议 |
|---|---|---|
| 1 | 把方法层/账本搬 workspace 会反转 D25/M2 | v1 留 home + 只读导出；若用户要求全搬，另立安全设计（签名/host-only/审批），不在本卡偷渡 |
| 2 | 一 home 多 workspace 会串公司/难选 active | v1 一安装一 workspace；换项目 = 新 home；多 workspace 后置 |
| 3 | 手册全量改名波及 5 presets + 骨架 + 门禁 + 文档 | v1 碰撞感知 seed（`AGENTS.md` 优先，已有则 `COMPANY.md`）；全量改名另案 |
| 4 | 启动器复制 `standalone` 逻辑，形成第二套 profile/provision | 启动器只做 bootstrap + env + spawn；profile 写入用 vendor 模板/CLI，不手写 DSH 机制 |
| 5 | 在已有 profile 上误用 `--from-default-profile` 会替换用户依赖 | 启动器只在 profile 缺失时建；已有则只验证/`plugin add`，不 reset |
| 6 | seed 进已有项目根 | 只补缺 + 打印计划 + 确认；推荐专用 workspace；`.dsh-company/.gitignore` 自忽略 |
| 7 | `bundle.json` 在 workspace 被模型写坏 | host 校验 + fail loud + home 恢复备份；数据卡明说“host-owned 约定，不是防篡改” |
| 8 | Windows / 路径空格 / 符号链接 | 继续 POSIX 验收；路径 canonical + 引号；Windows 不承诺 |
| 9 | 旧 `web` 部署升级 | 0.5.0 迁移说明；旧 home `bundle.json` 只读/迁移；`web` profile 仍可装但不作产品入口 |
| 10 | 文档/门禁大面积改，容易假绿 | 先改 `dist-manual` 与 README/手册，再改实现；每个门禁造红；release-smoke 真装 |
| 11 | 文档预算余量很小（data-model 75/76 等） | 先搬旧形状到 notes/archived + 链接；确需提额按 docs/AGENTS 写 Note；不“先提额再写” |
| 12 | 启动器 bin 安装形态未在本包集成 | 已证 pnpm 链 bin；集成后加 `company-entry-smoke`（profile 建/装/bin 调用/无参报错） |

## 10. 技术落地设计（实现层）

> 这一节回答 issue 卡 S1–S5“怎么做才落得下”。证据标签同前：**T** 实跑、**C** 源码读、**P** 设计。
> 不是实施授权；是给实现者的技术底稿。未验证处标 **U**，不要当承诺。

### 10.1 profile 与启动器

**已证（T）**：空 home 执行

```sh
DSH_HOME=$T/h node vendor/dsh/apps/cli/lib/bin.js \
  --profile company --from-default-profile web --dump-default-config
```

会写出 `profiles/company/package.json`（`dsh.profile.bundles = ['@deepseek-ai/dsh-base',
'@deepseek-ai/dsh-web-app']`、`dependencies: {}`）、`cordis.patch.yml`、`cordis.yml`、
`pnpm-workspace.yaml`；之后 `dsh plugin --profile company add <tgz>` 追加 `dsh-company-pack`。
**不要**在已有 profile 上再跑 `--from-default-profile`：它会替换同名 profile 的依赖与用户 patch
（C：vendor CLI README；FAQ 26 `90-advisor/93`）。

启动器算法（P）：

1. 解析 `--home`（默认 `~/.dsh-company/<workspace-slug>`，或显式 `DSH_HOME`；拒绝日用 `~/.dsh`
   除非用户显式 `--home`）；解析 `--workspace`（见 10.2）。
2. 若 `profiles/company/package.json` 不存在：调用上面的 `--from-default-profile web
   --dump-default-config`；若存在：读 `dsh.profile.bundles`，验证含 base/web-app；
   **缺 web-app 就拒绝并给“新建 home/改 profile”的指令，不 reset**。
3. 若 profile 依赖里没有 pack：`dsh plugin --profile company add <spec>`（repo 用 `link:`，
   安装形态用 `file:<tgz>` 或 registry spec）；已有就跳过。
4. seed 确认（10.3）；写 `<home>/company/settings.json` 的当前 workspace（非权威，便利）；
   spawn `dsh --profile company`，设 `DSH_HOME`、`DSH_COMPANY_HOME`、cwd=workspace。
5. `--reset` 只删带标记（`.company-home`）的 home；不删 workspace；无标记非空 home 拒绝接管。

启动器交付：repo 形态 tools/company.mjs（计划新增）；安装形态包 bin/dsh-company.mjs（历史，已删除）
（计划新增）。包 `bin` 会被 `dsh plugin add` 链到 `profiles/company/node_modules/.bin/`
（**T**，2026-11-01 小包实测），所以安装形态的入口路径可行；本包尚未集成，集成后加
`company-entry-smoke`（`--help` / 建 profile / 装 pack / 无参报错 / 不写日用 home）。

### 10.2 workspace 解析与 boot 登记

**优先级（启动器）**：`--workspace` > `DSH_COMPANY_HOME` > `<home>/company/settings.json` 最近 >
TTY 询问；无 TTY 且无值 → 非零退出 + 两条命令。**Host 只认 `DSH_COMPANY_HOME`**，不猜、不建；
无值 → `dataBlocked`，不 seed/不写身份/不登记，打可操作告警。

**登记机制（独立 host row，P + T 探针）**：

- 新增计划文件 src/host/register-workspace.ts，导出：

  ```ts
  export const inject = ['workspaceRegistry']
  export async function apply(ctx: Context): Promise<void> {
    const raw = process.env.DSH_COMPANY_HOME
    if (!raw) { ctx.logger?.warn?.('company: no workspace'); return }
    const path = canonicalPath(resolve(expandHomePath(raw)))
    // validate: exists + directory + not home/OS-home
    try {
      const ws = await ctx.workspaceRegistry.create(path)
      ctx.logger?.info?.(`company: workspace ${ws.id} @ ${ws.path}`)
    } catch (error) { ctx.logger?.warn?.(...) } // 不抛
  }
  ```

- `package.json` 增加 `exports["./register-workspace"]`（types + default）、`files` 增加
  `lib/register-workspace.js`；`tsdown.config.ts` 的 host 入口增加
  `'register-workspace': 'lib/types/host/register-workspace.js'`（与 `index` 同 format/platform）。
- `cordis.patch.yml` 的 `insert` 增加一行 `id: company-workspace-register`,
  `name: 'dsh-company-pack/register-workspace'`，放在 `company-client` 之前。
- `inject` 让 loader 等到 `workspaceRegistry` 就绪；`apply` async 被 loader 等待，所以登记在
  Web readiness 前完成。**T 探针已验证**：用独立 probe 包（subpath export + `inject` + async
  apply）装进 `company` profile，boot 输出 `[probe] registered <id> <path>` 在
  `dsh web:` 之前；`<home>/storages/workspace.json` 的 `tables.workspaces` 含该 path。
- `workspaceRegistry.create(path)` 要求已存在绝对目录、canonical 化、同 path 幂等；它不创建目录、
  不授予模型权限（C：`vendor/dsh/packages/workspace/workspace/src/index.ts`）。
- 若组合里没有 `workspaceRegistry`（headless），该 row 会 pending；本包产品入口要求 web profile，
  headless 不是产品面。若担心 pending 噪音，可把 row 放进 profile patch 而不是 bundle patch；
  v1 先按 bundle row 做，启动输出观察 pending。
- **不**在 `company-client` 的主 `apply` 里用 `ctx.inject` 做登记：那会引入 boot 时序竞态
  （Client 可能在登记前请求 workspace 列表）。独立 row 是首选。

### 10.3 seed 与 consent

当前骨架逻辑：`planBootstrap(skeletonDir, companyHome)` 只读、产出 `entries`；`applyBootstrap`
只创建、`wx` 防覆盖、可重入（C：`src/host/run-bundle/bootstrap.ts`）。保留这套；新增：

- consent 文件 `<workspace>/.dsh-company/.seed-consent`：
  ```json
  { "v": 1, "packVersion": "0.5.0", "workspace": "<canonical abs>", "consentedAt": "<ISO>" }
  ```
  启动器在用户确认后写；Host 读。**不用 planHash**：Host 的 `planBootstrap` 才是权威计划；
  consent 只证明“这个 workspace、这个 pack 版本被同意 seed”，避免两套计划算法漂移。
- Host 判定：`DSH_COMPANY_BOOTSTRAP=off` → 跳过；workspace 已有 `AGENTS.md`/`COMPANY.md`/
  `kb/company.md` → 视为已初始化，正常升级；否则只有 consent 匹配（canonical workspace +
  packVersion）才 seed；否则不写、不写身份、告警。
- 启动器打印计划：可以扫 pack 的 `workspace/` 给出“将建/将跳过”的摘要（advisory）；
  Host 的 `planBootstrap` 才是实际执行。两者不一致时以 Host 为准，启动器不写盘。
- 手册目标：Host 选 `AGENTS.md` 或 `COMPANY.md`（见 10.4）；consent 不绑定目标，Host 按当下
  碰撞决定；manifest 记录实际目标。
- 测试：无 consent 零写；consent 匹配才建；pack 版本变但 workspace 已初始化则升级；consent 在
  另一个 workspace 不生效；`DSH_COMPANY_BOOTSTRAP=off` 零写。

### 10.4 手册目标与注入

- `agent-instructions` 的 `instructionFileCandidates` 过滤含 `/`/`\` 的候选；`COMPANY.md` 合法
  （C：`vendor/dsh/packages/context/agent-instructions/src/config.ts` 的
  `resolveInstructionFileCandidates`）。
- 五个角色 preset 在 `agent-instructions` 行加：
  `instructionFileCandidates: ['AGENTS.md','COMPANY.md','CLAUDE.md']`；`projectRootMarkers: []`
  不变（projectRoot = session cwd）。
- Host seed 选择：
  - `AGENTS.md` 不存在 → 目标 `AGENTS.md`；
  - `AGENTS.md` 存在且 `COMPANY.md` 不存在 → 目标 `COMPANY.md`（内容取 pack 的
    `workspace/AGENTS.md`）；
  - 两者都在 → 不覆盖，告警“两份手册并存”，按候选顺序加载/去重。
- manifest v2 增加 `handbookTarget: 'AGENTS.md' | 'COMPANY.md'`；`skeleton.files` 的键用实际目标。
  升级时把 pack 源 `AGENTS.md` 映射到 `handbookTarget`，其余文件同名映射；用户改过的保留。
- `handbook-budget` 仍读 pack 源 `workspace/AGENTS.md`；`handbook-smoke` 需要覆盖两种目标
  （至少 keyless 断言候选与目标选择；真模型注入仍按现有 smoke 一条）。
- 风险：用户项目 `AGENTS.md` 也占 `maxBytes` 预算；公司手册在候选第一位，预算不足时更宽的文件
  先被丢（C：vendor `agent-instructions` 预算语义）；README 要提示“用户 AGENTS.md 过长可能
  挤掉公司手册”。

### 10.5 `bundle.json` v2 与迁移

- 类型（P）：
  ```ts
  interface BundleManifestV2 {
    v: 2
    id: string
    createdAt: string
    pack: { name: string; version: string }
    handbookTarget: 'AGENTS.md' | 'COMPANY.md'
    skeleton: { version: string; files: Record<string, string> }
  }
  ```
- 路径：`<workspace>/.dsh-company/bundle.json`；`bundleManifestPath(workspace)`。
  `appendUpgradeLog` 改 `<workspace>/.dsh-company/logs/company-pack-upgrade.log`。
- `readBundleManifestState(workspace)` / `validateBundleManifest` 升 v2；v1 文件不再被新路径读到。
- `planBundleManifest` 去掉 `workspace` 字段；`workspaceRecord` / `resolveRecordedWorkspace` /
  `planWorkspaceRebind` / `applyWorkspaceRebind` / `pruneBundleBackups` / `rebindEnabled` 退役；
  `DSH_COMPANY_REBIND` 设置时只 warn。
- 迁移：`migrateV1Manifest(dshHome, workspace)`：
  - 读 `<dshHome>/bundle.json`；`manifest.workspace` canonical 等于当前 workspace 才迁；
  - 写 v2（保留 id/createdAt/pack/skeleton；`handbookTarget` = 当前碰撞选择；v1 skeleton 的
    `AGENTS.md` 键映射到目标）；
  - 旧文件重命名 `bundle.json.migrated-<ISO>`（保留回滚），不删；
  - 不匹配 → 忽略旧文件，按新 workspace 首启（需要 consent）。
- 升级映射：`planSkeletonUpgrade` 遍历 pack 源文件，`AGENTS.md` → `handbookTarget`；
  `applySkeletonUpgrade` 用目标路径；`manifest.skeleton.files` 记目标键。
- 身份备份：`<dshHome>/company/identity/<bundleId>.json`（最近一份）在 manifest create/upgrade
  后写；workspace manifest 损坏/更高版本时 fail loud 并点名恢复备份；不自动覆盖。
- 风险：manifest 在 workspace，模型 `workspace-write` 可写；host 只能校验/备份，不能防篡改。
  数据卡与 README 明说；不要把它当安全边界。

### 10.6 方法层 / 账本：留 host + 导出

- 权威不动：`presentedDomain`（`<home>/storages/company_deliverables.json`）与
  `<home>/company/methods/<role>/`；`presented-domain.ts` / `cultivation-storage.ts` 不改路径。
- 新增计划文件 src/host/ledger/governance-export.ts：
  - `exportMethods(dshHome, workspace)`：`cpSync`/逐文件复制到
    `<workspace>/.dsh-company/exports/methods/`；先写 staging 临时目录再 rename；缺目录跳过；
    写 `README.md`（“derived export，权威在 home；不要编辑”）。
  - `exportLedger(store, workspace)`：`store.read()` → `{schema:1, exportedAt, source, ledger}` 写
    `<workspace>/.dsh-company/exports/ledger.json`；domain/legacy 均可；坏账本跳过并告警。
  - 触发：boot 账本初始化后、`present`/`/deliverables audit` 后、`/cultivation adopt` 后；
    失败只 warn，不影响主流程。
- 导出是派生，不是第二权威；不自动 import 回 home。恢复/迁移文档写“先恢复 home 权威，再由
  host 重新导出”；若未来要 workspace 直接恢复，另做带校验的 import 命令。
- 测试：adopt/audit 后导出更新；导出不改变 domain/methods；导出缺失不阻塞 boot；导出文件可读。

### 10.7 文档、门禁与 `_dist`

- `tools/export-dist.mjs`：重写 manual 模板；tarball inventory 增加
  `package/bin/dsh-company.mjs`、`package/lib/register-workspace.js`（计划路径），
  `package/workspace/AGENTS.md` 仍在；禁止 workspace 数据/凭据仍保留。
- `checks/gates/dist-manual.mjs` 的 required 改为新关键句：`company`、`--workspace`、
  `.dsh-company/bundle.json`、`AGENTS.md`/`COMPANY.md`、`exports`、`home` 治理、`sha256`、
  `Node`、`DSH`、`卸载`、`回退`、`pnpm 11/12`、`DSH_COMPANY_BROWSER`。不再要求
  `company-workspace`/`DSH_COMPANY_REBIND` 作为产品主路径（迁移段可提旧词）。
- `doc-budget`：现有余量小（data-model 75/76、profile 63/66、runtime-map 83/88）；改写前先
  决定“搬旧形状到 notes/archived + 链接”还是“按 docs/AGENTS 写 Note 提额”，不要先写超再提额。
- 全仓 stale-reference 清扫：用 `rg 'company-workspace|bundle\.json|DSH_COMPANY_REBIND|
  --profile web|一个 home 一个 bundle|侧栏.*工作区'` 分三类处置：现行合同改、历史 Note 加
  取代 banner、归档不动。检查 `dist-manual`/`bare-path`/`md-links`/`doc-budget` 同 diff。
- `release.mjs` / `release-manifest.json`：加 bin/register 条目；`_dist` sha256/手册同源。

### 10.8 测试矩阵（最小可落地）

| 切片 | keyless spec | 真实入口 smoke | 红证要点 |
|---|---|---|---|
| S1 profile/启动器 | `launcher.spec`：只建缺失、已有不 reset、无参/无 TTY 退出、settings 写入 | `company-entry-smoke`：建 home/profile、装 pack、bin 调用、banner、无日用 home 写入 | 改坏 `--from-default-profile` 条件 → 已有 profile 被替换即红 |
| S1 workspace 登记 | `register-workspace.spec`：无 env/坏路径/幂等/不抛；stub registry 调用 | `release-smoke` 的 workspace 列表 / `storages/workspace.json`；探针已 T | 去掉 `inject`/async wait → 登记晚于 banner 即红 |
| S1 seed | `seed-consent.spec`：无 consent 零写、consent 匹配、已初始化、pack 版本变、bootstrap off | `company-entry-smoke` 首启计划/二启零变更 | 去掉 consent 检查 → 未确认也写盘即红 |
| S2 bundle v2 | `bundle-manifest-v2.spec`：路径/形状/损坏/更高版本/v1 迁移/handbookTarget/备份 | `release-smoke`：无 home bundle、workspace v2、二启字节稳定 | 迁走 `bundleManifestPath` 到 home → 红 |
| S2 one workspace | `one-workspace.spec`：第二 `--workspace` 拒绝/提示新 home | 启动器二次传不同 workspace → 非零/提示 | 去掉检查 → 第二盘静默进同 home 即红 |
| S2 治理导出 | `governance-export.spec`：methods/ledger 导出、派生、不反向 | `present-catalog-smoke`：present 后导出在场；adopt 后导出更新 | 把导出当权威读 → 红（测试断言 authority 仍在 home） |
| S3 手册碰撞 | `handbook-target.spec`：AGENTS 优先/碰名 COMPANY/两者并存/pack 升 v3 映射 | `handbook-smoke` 两种目标至少 keyless 断言；真模型一条 | 强制只读 AGENTS → 已有项目公司手册不注入即红 |
| S4 文档/分发 | `doc-budget`/`dist-manual`/`md-links`/`bare-path` 门禁 | `export-dist` 真导出 + sha256 | 手册缺 `--workspace`/`.dsh-company` → 红 |
| S5 浏览器 | —（Playwright） | `client-load-smoke`：打开 token URL、当前 cwd=target、单 workspace CEO 会话/ composer、零 console error | 不登记 workspace → 首屏要求 Choose workspace 即红 |

### 10.9 技术风险（诚实）

- **浏览器自动选中已在探针里 T 验证**：`recentWorkspace()`/`connectWorkspace()` 的路径成立
  （§4.1b）；但 registrar 尚未集成进本包、seed/consent 与真实模型未覆盖。集成后仍需
  `client-load-smoke` 复验；如果真包不成立，首屏验收降为“workspace 已登记 + composer 可用”。
- **独立 row 的 pending**：headless/无 registry 时 pending 可能产生启动噪音；产品入口限 web；
  如果不可接受，把 row 放到 profile patch 或改成主 apply 的 inject（但会引入竞态）。先按 row 做，
  用真实 boot 输出验证。
- **`bundle.json` 可写**：模型能写/删；host 备份 + 校验 + fail loud 是上限，不承诺防篡改。
- **文档预算**：data-model 只剩 1 行；不改预算策略就写不下。先搬/压，再决定提额。
- **启动器 profile 安全**：已有 profile 的 `--from-default-profile` 是破坏性 reset；启动器必须
  只建缺失，已有只验证；测试要造“已有 profile + 错误 web-app”负例。
- **包 bin/第二入口**：bin 链接已 T；第二 host entry（register-workspace）尚未在本包构建，
  需 `tsdown`/`exports`/`files`/`pack-files` 门禁一起改，避免“tarball 少一个入口”。
- **Windows/路径**：继续 POSIX；路径空格/中文/符号链接用 canonical + 引号；不承诺 Windows。

## 11. 参考

**外部（repo 外，只读）**

- `_faq_on_digested/26_plugin-as-product/00-answer.md`、`00-question.md`、`00-index.md`
- 同目录 `10-foundations/15-four-spaces.md`、`16-startup-resolution.md`、`17-config-layers.md`、
  `18-install-upgrade.md`
- 同目录 `90-advisor/00-index.md`、`91-checklist.md`、`92-native-reference-architectures.md`、
  `93-app-plugin-walkthrough.md`
- 同目录 `30-external/34-profile-product-forms.md`、`35-profile-assembly-ownership.md`

**本仓当前合同**

- [运行态地图](../../../../docs/runtime-map.md)、[数据模型](../../../../docs/data-model.md)、
  [profile 合同](../../../../docs/profile.md)、[发布合同](../../../../docs/release.md)
- [公司包 README](../../../../packages/company-pack/README.md)、
  [公司盘 README](../../../../packages/company-pack/content/README.md)
- [run/README](../../../../run/README.md)、[runtime/README](../../../../runtime/README.md)
- [安装手册（生成物）](../../../../_dist/安装手册.md)

**源码直达（vendor 内，只读）**

- `vendor/dsh/apps/cli/README.md`、`apps/cli/src/args.ts`
- `vendor/dsh/packages/api/workspace-controller/README.md`、`packages/workspace/workspace/src/index.ts`
- `vendor/dsh/packages/api/session-controller/src/commands.ts`、`src/index.ts`
- `vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts`
- `vendor/dsh/packages/context/agent-instructions/src/config.ts`、`src/files.ts`
- `vendor/dsh/packages/session/working-directory/src/index.ts`
- `vendor/dsh/packages/bundle/base/cordis.patch.yml`、`packages/bundle/web-app/cordis.patch.yml`

**历史决定**

- [run-bundle-install-unit](../../../../notes/archived/2026-10-24-run-bundle-install-unit.md)、
  [data-model-alignment](../../../../notes/archived/2026-10-27-data-model-alignment.md)、
  [data-design-hardening](../../settled_issues/2026-10-28-data-design-hardening.md)、
  [standalone-deployment](../../../../notes/archived/2026-10-25-standalone-deployment.md)
