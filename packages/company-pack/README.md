# dsh-company-pack

> **给收件人（先读这个）**：本包是 `dsh-company-pack`（版本见 `package.json` / 手册表头）；DSH 窗口 =
> `engines.dsh`（`>=0.2.1-rc.2 <0.3.0`）。只需要 DSH 已安装且版本在窗口内；**不要求用户单独装
> Node/pnpm**（DSH 运行时自己负责）。安装、sha256 校验、升级、备份、卸载、回退见与
> tarball 同目录的《安装手册》（`_dist/安装手册.md`，由 `node tools/export-dist.mjs` 生成，不在 tarball 内）。
> 许可 = `UNLICENSED`（内部交付，未授予再分发权）。

## Install

**默认在 DSH Plugins 页安装**（web 与 Desktop 同一句）。CLI 只是 `dsh web` 自动化：

```sh
dsh --profile company --from-default-profile web --dump-default-config   # 仅首次
dsh plugin --profile company add <tarball>
```

装完重启 `dsh --profile company`。三个成功分开核：安装命令成功 → dependency 写入 →
`dsh.profile.bundles`；不要用 `--profile desktop`（CLI 不能管理 Desktop）。前置 = DSH 已安装且版本在
窗口内；不需要用户单独装 Node/pnpm；本包不在 npm registry。

- **产品形状**：一个 bundle 装进一个 named profile；插件内容全部在包内，run bundle 在用户
  `<workspace>/.dsh-company/`；home 只留 DSH 运行时与 host 治理。一个安装 = 一个公司，可顺序服务
  多个 workspace；不同公司 = 不同 `DSH_HOME`；并发多 workspace 后置。
- **启动**：`cd <workspace> && dsh --profile company`；`DSH_COMPANY_HOME` 可显式指定；无 workspace
  时 DSH Workspace picker/产品 onboarding 询问，Host boot 不等待。没有 `--workspace` flag。
- **浏览器可选**：npm 发布的 `@deepseek-ai/dsh` 不含 browser 两包，preset 默认禁用 browser 组；
  装两包后自动启用；`DSH_COMPANY_BROWSER=on/off` 可强制。

## What it contributes

- 五个角色 preset（CEO / VP-Eng / VP-Sales / COO / CFO）+ 委派子人格 `researcher`；
- host 行：签字、工作区门、团队、present、日期/节律、公司 client 面、run bundle 初始化、
  workspace 登记、handbook `systemPrompt.section`、成品目录/账本；
- `content/`：公司手册、模板、默认章程、状态默认值（只读产品内容，不 seed 到手写路径）；
- 公司视图与一套公司页签（成品、台账、待办、培养等；清单 = 客户端注册面，不在文档枚举）。

## Configuration

- `DSH_COMPANY_HOME`：显式 workspace（自动化/部署）。不设时按 cwd → saved → Client ask 解析。
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
| run bundle `W` | `.dsh-company/`：kb（公司/org/owners/台账/章程/journal）、deliverables、cultivation、logs、exports、overrides、`bundle.json`（v3） | 用户 workspace | 用户备份；状态只补缺，不覆盖 |
| 宿主状态 `H` | `company/identity/<id>.json`（身份备份）、`company-pack.lock`、`logs/company-client-errors.log`、`company/ledger/<hash>.json`（presented 账本）、`company/methods/<role>/` | `<DSH_HOME>` | 不动；方法层/账本同 home |
| 会话 `S` | 会话日志由宿主拥有；header.cwd 含 workspace 绝对路径 | `<DSH_HOME>/sessions/` | 不动 |
| 凭据 `X` | 不写入包；走 `<DSH_HOME>/.credentials.yaml` / 环境变量 | home | 用户管理；0600 |

`R` DSH workspace 登记与 `B` 浏览器 localStorage 是**边界**，不是本包平面。`bundle.json` 在 workspace
里，模型在 `workspace-write` 下可写；host 只校验 + 留 home 身份备份，**不是防篡改边界**。

## Backup

- `business` = 用户 workspace 的 `.dsh-company/` + home 的 `company/methods/`、`company/ledger/`、
  `company/identity/`（或已导出快照）；不含 sessions/凭据/索引。
- `full` = 整个 `DSH_HOME` + workspace；含会话正文/密钥/绝对路径，加密、限权、不共享。
- 恢复 `business`：新 home 解 `.dsh-company/` → `dsh plugin --profile company add` 同版本/新版本 →
  以该 workspace 启动；旧会话不回来。方法层/账本按 home 恢复或由 host 重新导出。

## Uninstall

`dsh plugin --profile company remove dsh-company-pack`（或应用内 Plugin Manager）：只摘插件与 profile
层；workspace、home（含 sessions、方法层、账本、身份备份）保留。要彻底删除一个部署，确认备份后删除
整个 `<DSH_HOME>` + workspace。详见《安装手册》第六节。

## 已知限制（随行为变更同 diff 更新）

- **侧栏角色色调只借平台令牌**（2026-10-13）：CEO 用 adaptive 的 `--dsw-alias-*` 品牌对（浅/深主题自动反转），其余四色用 **static 色相**（blue/green/amber/red，固定值、两主题同观感）+ 按底色选的黑/白字（对比度实测见探针 G6）——**不是**上游策展的分类色板（那份仍缺，见角色身份 UX 提案开放问题 2），换主题观感不一致处即此债。
- **侧栏角色标记受 16px 座位约束**（2026-10-13）：行首座位是**可共存的 list 格**（同格还有计划任务时钟，16px 跨度），故标记按 12px 设计、单字母（C/F/O/E/S）。与时钟同格时两者合计 28px > 座位 16px，靠"座位居中溢出 + 标题前 4px 间隙"恰好不撞标题盒（几何判据 = [sidebar-role-mark-probe](../../probes/browser-visual/sidebar-role-mark-probe.mjs)）；**再加第三个同格占用者、或把标记改宽，这条就破**。
- 机制与出厂行替换已对钉版 `dsh-v0.2.1-rc.2` 验证（2026-09-30 升 pin + 插件收割：pack-compat / release-smoke / 全套门禁；本仓嵌套工作区 vendor 自建偏离 = D27）。
- 委派子会话的签字审批到不了人（子会话审批面宿主侧受限）——人机审批实际是 Lead 专属（上游 seam 候选，见[归档搁置池](../../_backlog/_archive/legacy/suspended.md)）。
- 浮窗 raise 置顶依赖 CSS 垫片（vendor rc.2 缺陷；上游修复后撤垫片）。
- 依赖图画布按栏宽等比缩放（`transform: scale()`，fitScale 下限 0.75；**不用 CSS 宽度缩放**——Safari 里 foreignObject 文字不跟缩，会堆向左上角）；更宽的图（约 ≥5 个并行根任务）缩到下限后横向滚动。
- **依赖图串行长链高度可超单屏**（2026-10-19；2026-10-20 真样本复看）：`fitScale` 只缩宽、不缩高；21 节点**串行链**合成样本高 2366px，窄 pane 自带纵向滚动（用户接受）。真 21 节点会话是宽图（1716×321），390 窄栏只横向滚动、无纵向双滚动，见[看板卡](../../_backlog/_archive/settled_issues/2026-10-19-board-dag-ux-deep-dive.md)。
- **成品目录读生成索引**（2026-10-19；2026-10-25 产品化）：`kb/deliverables-index.json` 由本部署 host 在首启 / `present` 后生成（`presented` 来自 host 观测到的 present 事件；未核 = `null`，不冒充 false）；面板只读、不实时。完整审计仍是操作员/第二阶段职责。
- 浮窗几何记忆（位置/大小按页签 contentId 存 localStorage）按 **origin** 隔离：同一次服务运行 + 页面刷新有效；换端口重启即新 origin、记忆清零（vendor 侧栏布局持久化同此边界）。
- 成员会话常驻注入基线 = 手册字节数（**以 `handbook-budget` 门禁读数为准，此处不复述易腐数字**）：host 把 `content/AGENTS.md` 注入 system prompt section；超预算时运行时告警、门禁红，不静默截断。
- **培养页的可追溯链**（2026-10-29）：主任务入口为“让角色今后的工作更好”；方法行展示提出者角色语境、目标角色、来源（缺失则明说未知）、采纳时间和采纳后验证历史。pass/fail 都要求一条后续相似工作的依据并保留事件；失败不自动撤回。AI 起草候选仍未获批，入口只提供人写纠正/建议。
- **上网能力（`web_search` / `web_fetch`）必须随每个 preset 声明**：web-app bundle 把 host 上的 `tool-web` 行 `disabled: true`，改为按 agent preset 组合（vendor base 注释原文）——所以它**不是**全局继承来的；漏声明时角色与它 spawn 的 child 都静默无联网。子会话（`subagent` / team teammate）**继承 Lead 的组合**（`composeFrom`；roles-isolation §2/§4），故 Lead 有即可，不必另配。
- **one-shot 委托 child 的目录里看得见 Team 工具但调不通**（上游已登记限制，vendor tool-agent-team README "One-shot child tool visibility"；2026-10-02 真跑实证：child 目录 41 工具含全部六个 Team 工具，调用在身份确认后被拒）。防线 = CEO preset 两份委托 persona 各一句「别碰 team 工具，并行调研只用 subagent」+ `delegation-smoke --delegate` 的 [3] 守卫（边界变了就红）。
- **搜索成本 = 一次完整模型回合**：DeepSeek 无独立检索端点，每次 `web_search` 都按一次 Messages 调用计延迟与 token（故 `searchTimeoutMs` 设 60s）；凭据复用 `DEEPSEEK_API_KEY`，缺失即 fail-loud 结构化报错、不静默降级。`web_fetch` 为匿名抓取，只接受公开 HTTP(S) 目标。
