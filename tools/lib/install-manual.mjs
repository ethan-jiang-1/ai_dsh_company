/**
 * 《安装与使用手册》纯模板（2026-11-08 v4：使用者面向 + 第一次经营一家公司）。
 *
 * 由 `tools/export-dist.mjs` 注入版本/日期/sha256/条目数后写 `_dist/安装手册.md`。
 * 唯一事实源仍是本函数；手册永不手改。
 *
 * 受众与 owner（2026-11-02 拍板、2026-11-08 落实）：手册 = 收件人唯一的完整安装与使用路径；
 * 根 README / pack README 只留首屏 + 指针。命令契约由 `checks/gates/readme-manual-commands.mjs` 对账。
 *
 * 安装纪律（严格跟随 DSH）：
 * - 默认 = DSH 应用内 Plugins 页安装（web/Desktop 同一句）；用户只需要一个已安装的 DSH，且版本在窗口内；
 * - Desktop 自带 Node/pnpm；npm CLI / dsh web 的 Plugins 页需 pnpm 在 PATH；
 * - CLI `dsh plugin` 只作 headless/SDK/ACP 或 web 自动化；不能管理 Desktop profile；
 * - 入口 = `dsh --profile company`（CLI）或同一个 GUI 入口；没有 package bin；
 *   workspace 从启动 cwd/`DSH_COMPANY_HOME` 解析；公司状态在 `.dsh-company/`。
 * @param {{ version: string, tarballName: string, digest: string, date: string, expectedTag: string, entries: number }} input
 * @returns {string}
 */
export function renderInstallManual(input) {
  const b = '`'
  const q = (text) => `${b}${text}${b}`
  return `# 梦之队（dsh-company-pack）安装与使用手册

| | |
|---|---|
| 版本 | ${input.version} |
| 安装包 | ${q(input.tarballName)}（与本手册同目录） |
| 校验（sha256） | ${q(input.digest)} |
| 打包日期 | ${input.date} |
| 适用 DSH | ${q('engines.dsh')} 窗口内（${q('>=0.2.1-rc.2 <0.3.0')}；已验证基线 ${q(input.expectedTag)}） |
| 许可 | MIT（${q('LICENSE')} 随包） |

这个包把一间**六人虚拟公司**装进 DSH：CEO 接你的动议，按需要叫上工程、销售、运营、财务、市场，
开会式地把判断与成品交回来。**它不是独立 App，是 DSH 的插件**——没有自己的启动器，也没有单独的窗口；
装完在 DSH 的 Web 面里使用。

一个包装进 DSH 的一个 profile（一套已安装插件与配置）。插件内容全部在包内、只读；公司状态全部写进
你指定的项目目录 ${q('.dsh-company/')}；DSH 自己的会话与凭据留在 DSH 的 home，不混进项目。
一个安装 = 一个公司，可顺序服务多个项目；换项目不新建 home、不重装；不同公司才用不同 ${q('DSH_HOME')}。

## 一、它是什么

- **一个入口，六个岗位**：CEO 负责取舍与合稿；VP-Eng 管工程与技术方案；VP-Sales 管客户、定价与销售判断；
  COO 管交付承接与产能；CFO 管毛利、预算与合规；CMO 管市场洞察、MRD、增长与品牌。还有按需委派的系统架构师、
  系统质量与调研子人格。
- **一场动议走完一条链**：澄清目标 → 拆任务与依赖 → 拉起成员 → 跨角色互审 → 合稿，最后以交付卡片
  收口。过程在会话、任务板和成员空间里都看得见，分歧不会被抹平。
- **成品是文件，不是聊天记录**：定稿写进 ${q('deliverables/<日期>-<slug>/final.md')}；过程稿在
  ${q('drafts/')}；公司知识、台账与 journal 在 ${q('kb/')}。
- **越用越像你的公司**：角色可以按 journal 与培养记录改进方法（右栏「培养」）；公司状态可以整体备份、迁移。

## 二、开始之前

- **DSH 已安装**：官方 Desktop，或可用的 ${q('dsh')} CLI。先跑 ${q('dsh --version')}，确认版本在
  ${q('engines.dsh')} 窗口内（${q('>=0.2.1-rc.2 <0.3.0')}；本版本已认证基线 ${q(input.expectedTag)}）。
  不在窗口内先升级 DSH——安装器会拒绝不兼容的包，不要用 ${q('allow-version')} 绕过。
- **一个项目目录**：已存在、可写。不需要专用空盘；本包只在其中写 ${q('.dsh-company/')}。
- **Node 版本**：本包要求 ${q('^22.19.0 || >=24.0.0')}。DSH Desktop 自带满足条件的 Node；${q('dsh web')}
  用你运行 DSH 的那个 Node，先 ${q('node --version')} 确认。
- **模型凭据（必须）**：DSH 提供模型。打开 **Settings → Models**，填入 DeepSeek API Key 并保存，
  不需要重启服务。缺凭据时：会话仍能打开，但一发消息就报凭据错误（${q('INVALID_CREDENTIAL')} 或
  ${q('the API key resolved ... is blank')}）；补上即可。凭据由 DSH 管理，不写进这个包，也不写进项目。
- **运行时前置**：Desktop 自带 Node/pnpm；npm CLI / ${q('dsh web')} 的 Plugins 页需要 pnpm 在 PATH
  （或 ${q('corepack enable pnpm')}）。本包只挂 Web 面（Desktop 与 ${q('dsh web')}）；操作系统跟随 DSH，
  本版本在 macOS 验证，其他平台未逐平台认证。
- **许可**：MIT（${q('LICENSE')} 随包）。

## 三、安装（一条主路径）

### 3.1 在 DSH 应用内 Plugins 页安装（默认，web 与 Desktop 同一句）

1. 打开 DSH。
2. 进入 **Plugins** 页 → **Add plugin**。
3. 输入包名 ${q('dsh-company-pack')}（发布后），或粘贴安装包 ${q(input.tarballName)} 的**绝对路径**
   （未发布期；没有安装包时向发布方索取。该入口接受包名、Git、tarball、本地目录）。
4. 安装完成后确认结果是 ${q('application: applied')}；若提示重启/刷新，按提示重启**当前 profile**
   （浏览器模块不会热加载）。

**装好的三个可见标志（都在界面上，不用命令）**：

- Plugins 页的 **Installed plugins** 里出现「Dream Team Company Pack」（包名 ${q('dsh-company-pack')}），
  状态为已安装/已启用；
- 侧栏品牌变成「DSH 梦之队」；
- 新建会话的默认角色是「梦之队 CEO」，右栏菜单里出现公司页签（任务板 / 在场 / 成品等，清单以界面为准）。

**不要装错 profile**：DSH 的 Desktop 与 ${q('dsh web')} 各是一个 profile；装进哪个，就从哪个入口启动。
Desktop 用的是它自己的内置 profile，界面上不需要你输入名字；CLI 才需要 ${q('--profile')}。
CLI 的 ${q('--profile')} 只覆盖它能碰到的那一个，装错不会出现在 App 里。**已有 profile 时不要用**
${q('--from-default-profile')}——它会替换该 profile 的依赖与用户 patch。

三个成功（排障时分开核）：安装命令成功 → dependency 写入 → 进 ${q('dsh.profile.bundles')}；
只有第三个让功能存在。GUI 装完以 Plugins 页显示“已安装/启用”为准；机器核对见附录 B。

## 四、第一次经营一家公司

装好之后，用一件小而真的动议走一遍。每一步都有一个**界面上看得见的结果**。

1. **选项目目录**：在 DSH 里点 **Choose workspace**（或 **Add workspace…**），选中你的项目目录并进入。
   可见结果：composer 可用，侧栏品牌是「DSH 梦之队」。
2. **对 CEO 说一句话**：新建会话（默认「梦之队 CEO」），把动议原样发过去。可以直接用这个模板：

   > 下季度我们想把 <一件事> 做成付费功能。先问我三个最关键的问题，再判断值不值得做、怎么定价、
   > 现有团队接不接得住。

   可见结果：CEO 开始回话，先澄清而不是直接开写。
3. **回答澄清**：它问目标、约束、验收和预算；把答案回给它。可见结果：会话里出现一份简短的动议口径
   （目标 / 约束 / 判据），后续任务都按它走。
4. **看它组队**：CEO 拆任务、标依赖、拉起需要的成员。可见结果：右栏 **任务板** 出现多行卡片
   （owner 与依赖可见），**在场** 出现成员与 running/idle 状态。需要你批的操作会进右栏 **待办**
   （例如执行命令）：点开批准/拒绝，它才会继续；不处理会一直停着。
5. **进成员的空间**：会话头部点 **Team 名册**，或从 **在场** 点成员那一行。可见结果：打开该成员的
   独立会话，能看到它读 ${q('kb/<角色>/CHARTER.md')}、写自己的稿；成员会话不在顶层列表，别在侧栏找。
6. **收成品**：CEO 合稿后会给出交付卡片（${q('present')}）。可见结果：文件出现在
   ${q('deliverables/<日期>-<slug>/final.md')}，右栏 **成品** 页签按 final 列出来。

一场小动议通常几分钟到十几分钟，会调用多次模型；右栏 **用量** 页签看令牌消耗（只做令牌，不做美元）。
不满意可随时中断当前轮。成员之间的分歧会被保留在 final 里，不会被抹平——这正是这家公司的用法。

## 五、你的东西在哪

短答：**成品在 ${q('deliverables/')}，公司记忆在 ${q('kb/')}，日志在 ${q('logs/')}**，都在
${q('<workspace>/.dsh-company/')} 下。平时在界面里选 workspace 即可；${q('DSH_COMPANY_HOME')} 只是
自动化/部署时显式指定项目目录的入口，不用它也能用。完整平面：

| 平面 | 放什么 | 谁拥有 |
|---|---|---|
| 包内内容 | 运行时代码、角色定义、${q('content/')}（手册/模板/默认章程/状态默认值）、语言包、图标、组合声明 | 维护者；只读 |
| 用户 workspace | ${q('.dsh-company/')}：kb / deliverables / cultivation / logs / exports / overrides / ${q('bundle.json')}（v3，legacy 文件名） | 用户；可携带的公司状态 |
| DSH home | ${q('profiles/company')}、sessions、凭据、workspace 登记、lease、${q('company/methods/')}、${q('company/ledger/')}、${q('company/identity/')} | DSH + host 治理 |
| 派生索引 | ${q('<DSH_HOME>/cache/company/')} 下的会话检索索引（SQLite FTS5；单进程 owner） | 可删可重建；不进备份 |

**报告在哪**：${q('deliverables/<日期>-<slug>/final.md')} 是定稿；过程稿在 ${q('drafts/')}；
${q('kb/deliverables-index.json')} 是生成索引（首启 / 交付后生成，未核的字段为 ${q('null')}，不冒充 false）。

用户项目自己的项目指令文件不会被复制或覆盖；公司手册从包 ${q('content/')} 注入 system prompt，
不写入 workspace。模板默认读包；要改就放 ${q('.dsh-company/overrides/')}。

## 六、升级

- **外部插件没有 Update 按钮**：升级 = 安装新版本覆盖（tarball / registry 皆可），然后重启 profile、
  浏览器硬刷新；必要时才 Remove 再装。GUI 用 Plugins 页的 Remove / Add plugin；CLI（仅 web 自动化）用
  ${q('dsh plugin --profile company remove dsh-company-pack')} → ${q('dsh plugin --profile company add <新版本 tarball 路径>')}（或 ${q('dsh-company-pack@' + input.version)}）。
- 包内容随包版本只读；${q('.dsh-company/')} 状态只补缺，不覆盖你改过的文件。
- ${q('.dsh-company/bundle.json')} 的 ${q('pack')} 字段记录**创建这个公司状态的包版本**，不是当前
  安装版本；排障时以 Plugins 页/依赖里的版本为准。
- **降级/回退**：先备份 → 装回旧包 → 重启；更高 schema 的 ${q('bundle.json')}/账本/记录不会被旧版静默改写。
  DSH 没有命令级回滚；回退就是装回旧版本。

## 七、备份 / 迁移

| 姿势 | 打包什么 | 不包含 / 会丢什么 | 用途 |
|---|---|---|---|
| **business** | workspace 的 ${q('.dsh-company/')} + home 的 ${q('company/methods/')}、${q('company/ledger/')}、${q('company/identity/')}（或已导出的 ${q('exports/')}） | sessions、${q('.credentials.yaml')}、缓存 | 交接 / 换机器 / 业务归档 |
| **full** | 整个 ${q('DSH_HOME')} + workspace | 无；含会话正文、密钥、绝对路径 | 整机迁移 / 灾难恢复；加密、限权、不共享 |

${b}${b}${b}sh
tar -czf company-business.tgz -C /path/to/your-project .dsh-company
[ -d "$DSH_HOME/company/methods" ] && tar -czf company-business-methods.tgz -C "$DSH_HOME" company/methods
[ -d "$DSH_HOME/company/ledger" ] && tar -czf company-business-ledger.tgz -C "$DSH_HOME" company/ledger
${b}${b}${b}

恢复 business：新 home → 解 ${q('.dsh-company/')} → 用同一个安装入口装同版本/新版本 → 以该 workspace
启动；**没有 sessions，旧会话不会回来**；方法层/账本按 home 恢复（或由 host 重新导出）。
恢复 full：整 home + workspace 搬移；profile 依赖失效时重装；DSH 自己的 workspace 登记与 session cwd 是
绝对路径，搬完要重新添加工作区/接受旧会话不可续。

## 八、卸载

在 DSH 应用内 Plugin Manager 移除 ${q('dsh-company-pack')}（CLI 自动化才用
${q('dsh plugin --profile company remove dsh-company-pack')}）。只卸插件与 profile 层；数据默认留下：

| 留下什么 | 位置 |
|---|---|
| 公司状态（kb / deliverables / cultivation / logs / exports / bundle.json） | ${q('<workspace>/.dsh-company/')} |
| 身份备份、方法层、presented 账本 | ${q('<DSH_HOME>/company/')} |
| 并发写者锁（lease） | ${q('<DSH_HOME>/company-pack.lock')}（在 home 根，不在 ${q('company/')} 里） |
| workspace 登记行（host 经 DSH registry 加的） | ${q('<DSH_HOME>/storages/workspace.json')} |
| presented 账本 storage | ${q('<DSH_HOME>/storages/company_run_bundle_ledger.json')} |
| 客户端错误日志（已脱敏） | ${q('<DSH_HOME>/logs/company-client-errors.log')} |
| 浮窗几何 / 实例心跳（浏览器本地） | 浏览器 localStorage（按 origin 隔离；换端口即新 origin） |
| 会话与凭据（DSH 所有） | ${q('<DSH_HOME>/sessions/')}、${q('<DSH_HOME>/.credentials.yaml')} |

要彻底删除一个公司，确认备份后按面删除：

${b}${b}${b}sh
rm -rf <workspace>/.dsh-company
rm -rf <DSH_HOME>/company
rm -f  <DSH_HOME>/company-pack.lock
rm -f  <DSH_HOME>/logs/company-client-errors.log
rm -f  <DSH_HOME>/storages/company_run_bundle_ledger.json
rm -f  <DSH_HOME>/cache/company/session-search-*.db      # 派生索引，可删可重建
${b}${b}${b}

**不要**为了清插件删除整个 ${q('DSH_HOME')}——会话、凭据、其他 profile 的依赖都在那里。本包不代删用户项目。

## 九、故障排查与支持

### 9.1 常见现象

| 现象 | 原因与处理 |
|---|---|
| 发消息报凭据错误（${q('INVALID_CREDENTIAL')} / ${q('API key ... is blank')}） | 没配模型凭据或 key 无效：**Settings → Models** 填 DeepSeek API Key，保存即生效 |
| 装完在界面看不到 | 确认装的是当前 profile/当前 App（Desktop 与 web 是两个 profile）；重启 profile；看启动 stderr 的 ${q('did not activate')} |
| 刷新后什么都没出现 | 浏览器不热加载模块：重启 profile（Desktop 重启 App），再硬刷新页面 |
| 版本不匹配，安装被拒 | 先 ${q('dsh --version')} 升到 ${q('engines.dsh')} 窗口内；不要用 ${q('allow-version')} 绕过 |
| CLI 报包管理器缺失 | 这是 DSH 安装/运行时的问题，按 DSH 文档修；npm CLI / ${q('dsh web')} 的 Plugins 页需要 pnpm 在 PATH（Desktop 用内置 pnpm） |
| 首屏要求 Choose workspace | 启动时没有 workspace：从项目目录启动、设 ${q('DSH_COMPANY_HOME')}，或在 picker 里选 |
| 两个公司看到彼此的历史 | 复用了同一个 ${q('DSH_HOME')}：新开 home |
| 公司数据停写 | workspace 落点不安全 / ${q('bundle.json')} 坏 / lease 冲突：看启动输出 |
| 成员会话内容被截断 | 手册注入预算不足：升级到修复版本，或向发布方反馈（附现象与包版本） |
| 六角色报 ${q('browser-use-def ... never started')} | 没装 browser 两包却设了 ${q('DSH_COMPANY_BROWSER=on')}：装包或 unset/off |
| 升级后页面还是旧模块 | 重启 profile + 硬刷新；浏览器模块不热加载 |
| 一直停着不动 | 右栏 **待办** 有待批审批或待答问询：点开处理；不处理会话会停在等待 |
| ${q('bundle.json')} 损坏 | host 会停写并保留原文件；从 ${q('$DSH_HOME/company/identity/<id>.json')} 恢复或备份后让 host 重建 |

### 9.2 出问题去哪问

1. 先按 9.1 对照；机器核对见附录 B。
2. 仍不行：公开问题去 [仓库 issue](https://github.com/ethan-jiang-1/ai_dsh_company/issues)；
   未发布期拿到的是 tarball，也可以直接找给你安装包的发布方。
3. 提问时带上四样，能省一轮来回：${q('dsh --version')} 输出、包版本（Plugins 页）、
   现象截图/原文报错、启动 stderr（有 ${q('did not activate')} 时贴整行）。
4. **回退**：备份整个 home + workspace；用同一个安装入口装回上一个版本；旧版不会静默改写更高 schema 的状态文件。

## 附录 A、其他安装入口

### A.1 CLI：固定成独立的 company profile（仅 ${q('dsh web')}）

GUI 用户不需要这一节。CLI 的 ${q('--profile')} 只作 ${q('dsh web')} 自动化；**不能管理 Desktop**。

${b}${b}${b}sh
dsh --version                                                            # 必须在 engines.dsh 窗口内
dsh --profile company --from-default-profile web --dump-default-config   # 仅首次；仅 CLI web 自动化
dsh plugin --profile company add /path/to/${input.tarballName}           # 或 dsh-company-pack@${input.version}
${b}${b}${b}

> **仅 ${q('dsh web')}**。CLI 不能管理 Desktop 所在的 profile。
> ${q('--from-default-profile web')} 只在 profile 缺失时用；已有 profile 上再用会替换它的依赖与用户 patch。
> 公司包要求含 ${q('dsh-web-app')} 的 web template；base-only 自定义 profile 会让角色行 pending。

装完**重启该 profile**：${q('dsh --profile company')}。CLI 是另一个进程，宿主不知道。真启动一次，
stderr 不应有 ${q('did not activate')} 或 ${q('skipping profile bundle')}；${q('--dump-config')} 有 row
不等于挂载。

### A.2 从 DSH 市场发现（发布后）

市场是实验能力（Plugins → Experimental plugins → **Custom plugin markets**）。本版本未发布到 registry
时没有可加源；发布后按发布方给出的索引 URL/说明操作。市场 index 只做发现与展示；安装时 DSH 仍会读包
自身 manifest 的 ${q('engines.dsh')}，不兼容会被拒。

### A.3 可选：浏览器能力（条件启用）

npm 发布的 ${q('dsh')} 不含 ${q('dsh-browser-use')} 与 ${q('dsh-experimental-browser-use-playwright-mcp')}，
所以六个角色默认**不带** browser 工具。要开浏览器，用同一个安装入口装这两个包（GUI 用 Plugins 页；
headless/自动化用 ${q('dsh plugin --profile company add')}）。装进 profile 后，角色会自动探测并启用浏览器工具；
也可用 ${q('DSH_COMPANY_BROWSER=on/off')} 强制。**不要**在没装包时设 ${q('on')}——六个角色会报
${q('browser-use-def ... never started')}。

## 附录 B、机器核对

只在排障时用；主路径不需要。

${b}${b}${b}sh
dsh --version                    # 在 engines.dsh 窗口内
# GUI：Plugins 页显示 Dream Team Company Pack（包名 dsh-company-pack）已安装/启用
# CLI 自动化：
dsh --profile company --dump-config | grep -c company-pack   # 期望 ≥1
${b}${b}${b}

启动后可选核对公司状态：

${b}${b}${b}sh
cat "/path/to/your-project/.dsh-company/bundle.json"   # v3 / id / pack
ls /path/to/your-project/.dsh-company/kb               # company/org/owners/motion-ledger/角色目录
${b}${b}${b}

期望：workspace 根没有本包写出的手册/模板；${q('.dsh-company/')} 存在；启动 stderr 无
${q('did not activate')}；有 workspace 时首屏不要求你手动“加工作区”。

如要校验安装包字节（可选）：

${b}${b}${b}sh
shasum -a 256 ${input.tarballName}          # macOS；Linux 用 sha256sum
shasum -a 256 -c ${input.tarballName}.sha256
${b}${b}${b}
`
}
