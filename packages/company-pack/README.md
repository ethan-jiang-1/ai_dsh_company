---
description: "Six-role virtual company for DSH: CEO / VP-Eng / VP-Sales / COO / CFO / CMO presets (MRD/PRD product definition), company handbook and Web tabs."
kind: "package-reference"
---

# dsh-company-pack

> **给收件人（先读这个）**：本包是 `dsh-company-pack`（版本见 `package.json` / 手册表头）；DSH 窗口 =
> `engines.dsh`（`>=0.2.1-rc.2 <0.3.0`）。前置按运行时来源：**Desktop 自带 Node/pnpm**；
> **npm 全局 CLI / `dsh web` 的 Plugins 页**用 DSH 的 Node，pnpm 需在 PATH（或 `corepack enable pnpm`）。
> 安装、sha256 校验、升级、备份、卸载、回退见同版本生成的《安装手册》（仓库 `_dist/安装手册.md`）。
> 许可 = MIT（`LICENSE` 随包）。

## Install

在 DSH 的 **Plugins** 页 → **Add plugin** 安装：已发布版本输入包名 `dsh-company-pack`；未发布期粘贴
tarball 的**绝对路径**。按提示重启正在使用的 profile，之后用同一个入口启动——装进哪个 profile，
就从哪个入口启动，不要换到别处。

完整安装、装好的标志、第一次怎么用、升级、备份、卸载与回退见《安装手册》
（仓库 `_dist/安装手册.md`；手动分发时与 tarball 同目录）。CLI 安装（仅 `dsh web` 自动化）见该手册附录 A。

## Verify

- `dsh --profile company --dump-config`：能看到 `company-client` 与 `company-session-search` 行；
- 真启动一次：stderr 没有 `did not activate` / `skipping profile bundle`；
- Plugins 页：bundle 卡片可见，九条 preset 行（ceo / vp-eng / vp-sales / coo / cfo / cmo / worker / worker-researcher / worker-orchestrator）不 broken；
- 应用内安装的结果是 `application: applied`，或 `restart-required`（按提示重启后再验）；`failed` 才是失败。

## 交付形态

- **一个 bundle 装进一个 named profile**；插件内容全部在包内，公司状态在用户
  `<workspace>/.dsh-company/`；home 只留 DSH 运行时与 host 治理。一个安装 = 一个公司，同一 home
  可顺序服务多个 workspace；不同公司 = 不同 `DSH_HOME`。
- **启动**：`cd <workspace> && dsh --profile company`；`DSH_COMPANY_HOME` 可显式指定；无 workspace
  时 DSH Workspace picker 询问（本包不自建 onboarding），Host boot 不等待。
- **浏览器可选**：npm 发布的 `@deepseek-ai/dsh` 不含 browser 两包，preset 默认禁用 browser 组；
  装两包后自动启用；`DSH_COMPANY_BROWSER=on/off` 可强制。

## Compatibility

- `engines.dsh`（`>=0.2.1-rc.2 <0.3.0`）是唯一硬版本门；有它时 peer 范围不参与判定。
- 已验证运行时：`dsh-v0.2.1-rc.5`（`release-smoke` 全链，兼容台账已加列）。历史基线
  `dsh-v0.2.1-rc.2`（曾全链认证，保留对照）；窗口内其他 0.2.x 未执行，不等于承诺。
- market index 里的 `engines.dsh` 只用于展示/推荐；安装时以包自身 manifest 为准。
- 不兼容时安装会被拒绝并回滚；`allow-version` 是用户的逃生门，不是作者兼容策略。

## Upgrade

- 外部插件没有 Update 按钮：升级 = 安装新版本覆盖（tarball/registry 皆可），然后重启 profile、
  浏览器硬刷新；必要时才 Remove 再装。
- 包内容随包版本只读；`.dsh-company/` 状态只补缺，不覆盖用户改过的文件。
- 回退 = 装回旧版本；DSH 没有命令级回滚。升级前记下当前版本与 lock。

## 排障

- **装完看不到**：确认装的是当前 profile/当前 App（Desktop 与 web 是两个 profile）；重启 profile；
  看启动 stderr 的 `did not activate` / `skipping profile bundle`。
- **装不上/版本门**：先 `dsh --version` 确认在 `engines.dsh` 窗口内；不匹配时升级 DSH，不要用
  `allow-version` 绕过。
- **CLI 报包管理器缺失**：npm CLI 路径需要 pnpm 在 PATH（或 `corepack enable pnpm`）；Desktop 用内置 pnpm。
- **workspace 没出现**：从项目目录启动或设 `DSH_COMPANY_HOME`；无 workspace 时 Host 故意不写，等 DSH picker。

## What it contributes

- 六个角色 preset（CEO / VP-Eng / VP-Sales / COO / CFO / CMO）+ worker family（worker / worker-researcher / worker-orchestrator）；
- 产品定义：默认链 MRD → StRS → PRD——CMO 出 MRD（`MR-###`）+ StRS（`REQ-###`），VP-Eng 出 PRD（`REQ-###` / `AC-###-#` / slice）；SyRS/IRS/V&V 改为按需指派 owner；
  编号合同（R1–R10、退役词、范围豁免、并发）住 `content/state/process-docs.md`；共享 `product-definition`；
  `/prd check <目录名>` 校验 MRD/PRD 结构，`/req check <目录名>` 校验编号/层/追溯/退役词/计数（操作员命令，角色不自证）；
- host 行：签字、工作区门、团队、present、日期/节律、公司 client 面、公司状态初始化、
  workspace 登记、handbook `systemPrompt.section`、成品目录/账本；
- `company-session-search`（insert + isolate 组）：角色 `session_search` 工具 + 独立
  `sessionQuery` provider；不替换 host 行，所以默认应用内安装能 live 应用；
- `content/`：公司手册、模板、默认章程、状态默认值（只读插件内容，不 seed 到手写路径）；
- 公司视图与一套公司页签（成品、台账、待办、培养等；清单 = 客户端注册面，不在文档枚举）。

## Market / discovery

市场是 DSH 的实验能力（Plugins → Experimental plugins → Custom plugin markets）。**安装不依赖它**：
拿到包名/版本直接 `dsh plugin add`，或应用内 Plugins 页的 Add plugin 输入包名。
本版本尚未发布到 registry，索引源由发布方在发布后提供；未发布前不提供加源指引。

## Configuration

- `DSH_COMPANY_HOME`：显式 workspace（自动化/部署）。不设时按 cwd → saved → DSH Workspace picker 解析（本包不自建 onboarding）。
- `DSH_COMPANY_BROWSER`：浏览器能力开关；缺省 = profile 能解析 browser 两包就开，否则关；`on`/`off` 强制。
- `company-client` 行的 `cultivationRoot`：方法层根；缺席时 `/cultivation adopt|revoke` 明确报错。
- 兼容窗口：`engines.dsh`（运行时只读这一行；没有它才看 peers）。
- 本包不导出 Config schema（唯一可调项 `cultivationRoot` 是可选行 config，没有 schema 校验）。

## Data

逐项数据卡（权威/作用域/寿命/删除/迁移）= [docs/data-model.md](../../docs/data-model.md)。平面摘要：

| 平面 | 我们写什么 | 位置 | 升级/卸载 |
|---|---|---|---|
| 定义 `D` | preset / persona / skills / handbook / templates / default charters：只读声明 | 包 `presets/**` + `content/**`（`dsh.bundle.patch` 显式引用） | 随包版本 |
| 包 `C` | 无用户数据 | 安装包目录 | 升级整体替换；**绝不在包目录写 data/cache/日志** |
| 公司状态 `W` | `.dsh-company/`：kb（公司/org/owners/台账/章程/journal）、deliverables、cultivation、logs、exports、overrides、`bundle.json`（v3，legacy 文件名） | 用户 workspace | 用户备份；状态只补缺，不覆盖 |
| 宿主状态 `H` | `company/identity/<id>.json`（身份备份）、`company-pack.lock`、`logs/company-client-errors.log`、`company/ledger/<hash>.json`（presented 账本）、`company/methods/<role>/` | `<DSH_HOME>` | 不动；方法层/账本同 home |
| 派生 `K` | 会话检索索引（SQLite FTS5）；单进程 owner、per profile | `<DSH_HOME>/cache/company/session-search-<profile>.db` | 可删可重建；不进备份；不跨 profile 共享 |
| 会话 `S` | 会话日志由宿主拥有；header.cwd 含 workspace 绝对路径 | `<DSH_HOME>/sessions/` | 不动 |
| 凭据 `X` | 不写入包；走 `<DSH_HOME>/.credentials.yaml` / 环境变量 | home | 用户管理；0600 |

`R` DSH workspace 登记与 `B` 浏览器 localStorage 是**边界**，不是本包平面。`bundle.json` 在 workspace
里，模型在 `workspace-write` 下可写；host 只校验 + 留 home 身份备份，**不是防篡改边界**。

## Backup

- `business` = 用户 workspace 的 `.dsh-company/` + home 的 `company/methods/`、`company/ledger/`、
  `company/identity/`（或已导出快照）；不含 sessions/凭据/索引。
- `full` = 整个 `DSH_HOME` + workspace；含会话正文/密钥/绝对路径，加密、限权、不共享。
- 恢复 `business`：新 home 解 `.dsh-company/` → `dsh --profile company --from-default-profile web
  --dump-default-config`（仅首次）→ `dsh plugin --profile company add` 同版本/新版本 → 以该 workspace
  启动；旧会话不回来。方法层/账本按 home 恢复或由 host 重新导出。

## Uninstall

`dsh plugin --profile company remove dsh-company-pack`（或应用内 Plugin Manager）：只摘插件与 profile
层；**数据默认全部留下**。要彻底删除一个公司，确认备份后按面删除：

```sh
rm -rf <workspace>/.dsh-company                       # 公司状态（kb/deliverables/cultivation/bundle.json）
rm -rf <DSH_HOME>/company                             # identity / methods / ledger
rm -f  <DSH_HOME>/storages/company_run_bundle_ledger.json
# 会话、凭据、其他 profile 依赖 HOME 里的共享状态，不要整删 DSH_HOME
```

`<DSH_HOME>/cache/company/session-search-*.db` 是派生索引，可删可重建；不要为了清插件删整个
`DSH_HOME`（会话/凭据/workspace 登记都在那里）。详见《安装手册》卸载节。

## 已知限制（随行为变更同 diff 更新）

- **编号校验（`/req check`）的 v1 边界**：跨动议引用 `<动议键>:<ID>` 未实现（遇到只标未支持）；并发取号不加锁（靠 Lead 串行分配 + 撞号红兜底）；旧动议无 `编号体系:` 标记即 `skipped`（只读豁免，不回溯判红）。
- **只支持 web 组合**：`company-client` 的 `inject` 声明 `workspaceRegistry`（由 web-app 组合提供）；base-only / headless profile 不加载本包。这不是缺陷，是本包的 app surface = Web（[release.md](../../docs/release.md) 六轴）。
- **`dsh.client.inject` 的 8 条边** = 本包 client 模块 factory 的真实依赖（不是 bundle require）；删除需上游合同/证据，故保留。
- **品牌只替换 name 槽**：client 面只占 `sidebar.brand.name`，保留官方 mark 与 `conversation.hero.brand.mark`；这是与 `ui-brand-official` 的 `single` 槽共存的最小侵入，不是“完整皮肤”。
- **侧栏内容搜索保持 DSH 出厂行为**：本包不再替换 host 的 `session-query-sqlite`——改值替换会让默认的应用内安装（Plugins 页/`plugin_manager`）在 live recomposition 时报 `file-upload: Agent resolver is already registered`。`company-session-search` 隔离组只给角色 `session_search` 工具用；DSH 侧栏 `session/search` 保持出厂 `openAt: never`（有会话时搜索会报禁用），不是本包承诺。
- **侧栏角色色调只借平台令牌**：CEO 用 adaptive 的 `--dsw-alias-*` 品牌对（浅/深主题自动反转），其余五色用 **static 色相**（blue/green/amber/red/deepseek，固定值、两主题同观感）+ 按底色选的黑/白字（对比度实测见探针 G6）——**不是**上游策展的分类色板（那份仍缺，见角色身份 UX 提案开放问题 2），换主题观感不一致处即此债。
- **侧栏角色标记受 16px 座位约束**：行首座位是**可共存的 list 格**（同格还有计划任务时钟，16px 跨度），故标记按 12px 设计、单字母（C/F/O/E/S/M）。与时钟同格时两者合计 28px > 座位 16px，靠"座位居中溢出 + 标题前 4px 间隙"恰好不撞标题盒（几何判据 = [sidebar-role-mark-probe](../../probes/browser-visual/sidebar-role-mark-probe.mjs)）；**再加第三个同格占用者、或把标记改宽，这条就破**。
- **VP-Eng 组队的三道门**：根门 = Team Lead（可 `spawn_teammate` 带研发小队，成员继承 VP-Eng 组合、不是别的角色）；命名 child（`vp_eng`）不是 team member、不能 spawn，但能请 `vp_cmo`（depth 2）；CEO 团队里的 `vp-eng` teammate 受 CEO 的 `vp_cmo maxDepth 1` 限制——要整包就开 VP-Eng 根门。
- 委派子会话的签字审批到不了人（子会话审批面宿主侧受限）——人机审批实际是 Lead 专属（上游 seam 候选，见[归档搁置池](../../_backlog/_archive/legacy/suspended.md)）。
- 浮窗 raise 置顶依赖 CSS 垫片（vendor rc.2 缺陷；上游修复后撤垫片）。
- 依赖图画布按栏宽等比缩放（`transform: scale()`，fitScale 下限 0.75；**不用 CSS 宽度缩放**——Safari 里 foreignObject 文字不跟缩，会堆向左上角）；更宽的图（约 ≥5 个并行根任务）缩到下限后横向滚动。
- **依赖图串行长链高度可超单屏**：`fitScale` 只缩宽、不缩高；21 节点**串行链**合成样本高 2366px，窄 pane 自带纵向滚动（用户接受）。真 21 节点会话是宽图（1716×321），390 窄栏只横向滚动、无纵向双滚动，见[看板卡](../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)。
- **成品目录读生成索引**：`kb/deliverables-index.json` 由本部署 host 在首启 / `present` 后生成（`presented` 来自 host 观测到的 present 事件；未核 = `null`，不冒充 false）；面板只读、不实时。完整审计仍是操作员/第二阶段职责。
- 浮窗几何记忆（位置/大小按页签 contentId 存 localStorage）按 **origin** 隔离：同一次服务运行 + 页面刷新有效；换端口重启即新 origin、记忆清零（vendor 侧栏布局持久化同此边界）。
- **三层内容与加载档位（2026-11-09）**：`content/generic/`（T0 常驻 + T2 按需）/ `content/product-types/<id>/`（T1 摘要 + T2/T3）/ `content/company/`（T0–T2）；`content/contracts/` 随 DSH pin。`content/manifest.json` 是唯一清单（`content-manifest` 门禁查完整性与预算：T0 ≤6KB、T1 ≤4KB、T2 单文件 ≤6KB）。host 只把 `content/AGENTS.md`（T0）注入 system prompt section，其余按指针读；超预算运行时告警、门禁红。
- **显示名 = 角色名**（D14 2026-11-09 收窄）：公司名只在品牌/身份面；品牌读 `.dsh-company/kb/company.md` frontmatter 的 `productName`，旧盘无 frontmatter 时回退出厂词标 `DSH 梦之队`。
- **产品类型包的边界**：`/req check` 按 `company.md` 的 `productType` 读 `check-rules.json`——非五层类型（如 `b2b-saas`）返回"不走五层编号体系"而不是判红；时区仍写死 `Asia/Shanghai`（未接 profile）。
- **培养页的可追溯链**：主任务入口为“让角色今后的工作更好”；方法行展示提出者角色语境、目标角色、来源（缺失则明说未知）、采纳时间和采纳后验证历史。pass/fail 都要求一条后续相似工作的依据并保留事件；失败不自动撤回。AI 起草候选仍未获批，入口只提供人写纠正/建议。
- **上网能力（`web_search` / `web_fetch`）必须随每个 preset 声明**：web-app bundle 把 host 上的 `tool-web` 行 `disabled: true`，改为按 agent preset 组合（vendor base 注释原文）——所以它**不是**全局继承来的；漏声明时角色与它 spawn 的 child 都静默无联网。子会话（`subagent` / team teammate）**继承 Lead 的组合**（`composeFrom`；roles-isolation §2/§4），故 Lead 有即可，不必另配。
- **one-shot 委托 child 的目录里看得见 Team 工具但调不通**（上游已登记限制，vendor tool-agent-team README "One-shot child tool visibility"；2026-10-02 真跑实证：child 目录 41 工具含全部六个 Team 工具，调用在身份确认后被拒）。防线 = CEO preset 两份委托 persona 各一句「别碰 team 工具，并行调研只用 subagent」+ `delegation-smoke --delegate` 的 [3] 守卫（边界变了就红）。
- **搜索成本 = 一次完整模型回合**：DeepSeek 无独立检索端点，每次 `web_search` 都按一次 Messages 调用计延迟与 token（故 `searchTimeoutMs` 设 60s）；凭据复用 `DEEPSEEK_API_KEY`，缺失即 fail-loud 结构化报错、不静默降级。`web_fetch` 为匿名抓取，只接受公开 HTTP(S) 目标。
