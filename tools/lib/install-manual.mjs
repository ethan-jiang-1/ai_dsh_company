/**
 * 《安装手册》纯模板（2026-11-01 v3，DSH-native 安装）。
 *
 * 由 `tools/export-dist.mjs` 注入版本/日期/sha256/条目数后写 `_dist/安装手册.md`。
 * 唯一事实源仍是本函数；手册永不手改。
 *
 * 安装纪律（严格跟随 DSH）：
 * - 默认 = DSH 应用内 Plugins 页安装（web/Desktop 同一句）；用户只需要一个已安装的 DSH，且版本在窗口内；
 * - 不要求用户单独安装 Node/pnpm/构建工具——这些是 DSH 自己的运行时；
 * - CLI `dsh plugin` 只作 headless/SDK/ACP 或 web 自动化；不能管理 Desktop profile；
 * - 入口 = `dsh --profile company`；没有 package bin；没有 `--workspace`；run bundle 在 `.dsh-company/`。
 * @param {{ version: string, tarballName: string, digest: string, date: string, expectedTag: string, entries: number }} input
 * @returns {string}
 */
export function renderInstallManual(input) {
  const b = '`'
  const q = (text) => `${b}${text}${b}`
  return `# dsh-company-pack 安装手册

| | |
|---|---|
| 版本 | ${input.version} |
| 安装包 | ${q(input.tarballName)}（与本手册同目录） |
| 校验（sha256） | ${q(input.digest)} |
| 打包日期 | ${input.date} |
| 适用 DSH | ${q('engines.dsh')} 窗口内（本包验证基线：vendor ${q(input.expectedTag)}；npm 发布版 ${q('0.2.1-rc.3')}） |
| 许可 | ${q('UNLICENSED')}（内部交付，未授予再分发权） |

这个安装包是自包含的：bundle 补丁、五个角色 preset、浏览器端、host 行，以及 ${q('content/')}
（公司手册/模板/默认章程/状态默认值）。**没有产品启动器、没有 package bin、没有可写的 profile 目录。**

**产品形状（0.6.0 起）**：一个 bundle 装进一个 named profile。插件内容全部在包内；生产状态与最终
artifacts（run bundle）全部在用户 workspace 的 ${q('.dsh-company/')}；home 只留 DSH 运行时与 host
治理（sessions / 凭据 / workspace 登记 / lease / 方法层 / presented 账本 / 身份备份）。一个安装 =
一个公司，可顺序服务多个 workspace；不同公司才用不同 ${q('DSH_HOME')}。

> **0.6.0 是破坏性布局**：0.5.0 的根目录骨架（手册/模板/kb/deliverables 在 workspace 根）不会自动迁移。
> 旧文件原样保留；请在新 workspace 重新开始，或按本手册手工把需要的数据搬进 ${q('.dsh-company/')}。

## 零、前置：只需要一个已安装的 DSH

- **DSH 已安装**：官方 Desktop，或可用的 ${q('dsh')} CLI。先 ${q('dsh --version')}，确认版本在
  ${q('engines.dsh')} 窗口内；不在窗口内先升级 DSH（安装器会拒绝不兼容的包）。
- **一个 workspace 目录**：已存在、可写。不需要专用空盘；产品只在其中写 ${q('.dsh-company/')}。
- **不需要**为这个包单独安装 Node、pnpm、构建工具或修改 profile 文件——它们属于 DSH 自己的运行时；
  用户只面对 DSH 的 Plugins 页/CLI。
- **许可**：内部交付（${q('UNLICENSED')}），未授予再分发权。

## 一、安装：默认在 DSH 应用内 Plugins 页

### GUI（默认，web 与 Desktop 同一句）

1. 打开 DSH。
2. 进入 **Plugins** 页。
3. 安装 ${q('dsh-company-pack')}。
4. 若界面提示重启/刷新，按提示重启 profile（浏览器模块不会热加载）。

Desktop 用户也用这一句。**不要**用 CLI 的 profile 参数去装 Desktop——CLI 只覆盖它能碰到的那一个
profile，装错不会出现在 App 里。

三个成功（排障时分开核）：安装命令成功 → dependency 写入 → 进 ${q('dsh.profile.bundles')}；
只有第三个让功能存在。GUI 装完以 Plugins 页显示“已安装/启用”为准。

### CLI（只用于 headless/SDK/ACP 或 ${q('dsh web')} 自动化）

GUI 用户不需要这一节。CLI 的 ${q('--profile')} 只作 ${q('dsh web')} 自动化；**不能管理 Desktop**。

${b}${b}${b}sh
dsh --version                                  # 必须在 engines.dsh 窗口内
dsh --profile company --from-default-profile web --dump-default-config   # 仅首次；仅 CLI web 自动化
dsh plugin --profile company add /path/to/${input.tarballName}
${b}${b}${b}

> **仅 ${q('dsh web')}**。CLI 不能管理 Desktop profile（双门禁闭）。
> ${q('--from-default-profile web')} 只在 profile 缺失时用；已有 profile 上再用会替换它的依赖与用户 patch。
> 公司包要求含 ${q('dsh-web-app')} 的 web template；base-only 自定义 profile 会让 preset 行 pending。

装完**重启该 profile**；CLI 是另一个进程，宿主不知道。真启动一次，stderr 不应有
${q('did not activate')} 或 ${q('skipping profile bundle')}；${q('--dump-config')} 有 row 不等于挂载。

### 可选：浏览器能力（条件启用）

npm 发布的 ${q('dsh')} 不含 ${q('dsh-browser-use')} 与 ${q('dsh-experimental-browser-use-playwright-mcp')}，
所以五个角色默认**不带** browser 工具。要开浏览器，用同一个安装入口装这两个包（GUI 用 Plugins 页；
headless/自动化用 ${q('dsh plugin --profile company add')}）。装进 profile 后 preset 自动探测并启用；
也可用 ${q('DSH_COMPANY_BROWSER=on/off')} 强制。**不要**在没装包时设 ${q('on')}——五个角色会报
${q('browser-use-def ... never started')}。

## 二、第一次启动

安装完成后：

- **GUI**：从 DSH 的 Workspace picker 选择你的项目目录（或直接打开已有 workspace），首屏即可开工。
- **CLI/web 自动化**：在项目目录启动：

${b}${b}${b}sh
cd /path/to/your-project
dsh --profile company
# 或显式指定：
DSH_COMPANY_HOME=/path/to/your-project dsh --profile company
${b}${b}${b}

workspace 优先级：${q('DSH_COMPANY_HOME')} → 启动 cwd（合理项目目录）→ ${q('DSH_HOME/company/settings.json')}
的最近选择（便利提示）→ DSH Workspace picker / 产品 onboarding。**没有 workspace 专用命令行参数，
也没有终端 TTY 询问。** 没有 workspace 时 Host 不写盘；Host boot 不等用户。

首启会：

- 在 workspace 建 ${q('.dsh-company/')}：${q('kb/')}、${q('deliverables/')}、${q('cultivation/')}、
  ${q('logs/')}、${q('exports/')}、${q('overrides/')}；
- 只补缺地写状态实例（company/org/owners/台账/章程）；不覆盖已有文件；
- 写 ${q('.dsh-company/bundle.json')}（v3：id / createdAt / pack）；
- 登记 workspace（如果启动时已知道）；首屏由 DSH picker / 本包 client 回答；
- **不**在 workspace 根写手册/模板/kb/deliverables；**不**在 home 根写 bundle。

首启是 DSH 的 token 门：${q('dsh web')} 打印 ${q('?token=…')} URL；无 token 401，带 token 303 +
HttpOnly cookie → SPA。原生没有欢迎页/向导；Desktop 不依赖 ${q('welcome-notice')}。

## 三、验证

先确认 DSH 版本与安装状态：

${b}${b}${b}sh
dsh --version                    # 在 engines.dsh 窗口内
# GUI：Plugins 页显示 dsh-company-pack 已安装/启用
# CLI 自动化：
dsh --profile company --dump-config | grep -c company-pack   # 期望 ≥1
${b}${b}${b}

启动后可选核对 run bundle：

${b}${b}${b}sh
cat "/path/to/your-project/.dsh-company/bundle.json"   # v3 / id / pack
ls /path/to/your-project/.dsh-company/kb               # company/org/owners/motion-ledger/角色目录
${b}${b}${b}

期望：workspace 根没有产品写出的手册/模板；${q('.dsh-company/')} 存在；启动 stderr 无
${q('did not activate')}；有 workspace 时首屏不要求你手动“加工作区”。

如要校验安装包字节（可选）：

${b}${b}${b}sh
shasum -a 256 ${input.tarballName}          # macOS；Linux 用 sha256sum
shasum -a 256 -c ${input.tarballName}.sha256
${b}${b}${b}

## 四、数据布局

| 平面 | 放什么 | 谁拥有 |
|---|---|---|
| 包内内容 | ${q('presets/**')}、${q('src/**')}、${q('content/**')}（手册/模板/默认章程/状态默认值） | 维护者；只读 |
| 用户 workspace | ${q('.dsh-company/')}：kb / deliverables / cultivation / logs / exports / overrides / ${q('bundle.json')}（v3） | 用户；可携带的 run bundle |
| 产品 home | ${q('profiles/company')}、sessions、凭据、workspace 登记、lease、${q('company/methods/')}、${q('company/ledger/')}、${q('company/identity/')} | DSH + host 治理 |

用户项目自己的项目指令文件不会被复制或覆盖；公司手册从包 ${q('content/AGENTS.md')} 注入 system prompt，
不写入 workspace。模板默认读包；要改就放 ${q('.dsh-company/overrides/')}。

## 五、升级

- **GUI（默认）**：在 Plugins 页更新/重装新版本，按提示重启 profile；浏览器硬刷新。
- **CLI（仅 web 自动化）**：${q('dsh plugin --profile company add')} 新 tgz，重启 profile。
- 0.6.0 起没有“基部哈希替换”：包内容随包版本只读；${q('.dsh-company/')} 状态只补缺，不覆盖你改过的文件。
- 旧 0.5.0 根目录布局不做自动迁移；需要保留的数据请手工搬进 ${q('.dsh-company/')}。
- **降级**：先备份 → 装回旧包 → 重启；更高 schema 的 ${q('bundle.json')}/账本/记录不会被旧版静默改写。

## 六、备份 / 迁移

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

## 七、卸载

在 DSH 应用内 Plugin Manager 移除 ${q('dsh-company-pack')}（CLI 自动化才用
${q('dsh plugin --profile company remove dsh-company-pack')}）。只卸插件、不动 workspace/home 数据；
要彻底删除一个公司，确认备份后删除整个 ${q('DSH_HOME')} 和 workspace。产品不代删用户项目。

## 八、安装失败与回退

- **版本不匹配**：安装会被拒绝并报 ${q('incompatible-version')}；先升级 DSH 到 ${q('engines.dsh')} 窗口内，
  不要用 ${q('allow-version')} 绕过。
- **安装后在界面看不到**：确认是装在当前 profile/当前 App（Desktop 与 web 是两个 profile）；重启 profile；
  看 Plugins 页与启动 stderr 的 ${q('did not activate')}。
- **CLI 报包管理器缺失**：这是 DSH 安装/运行时的问题，按 DSH 安装文档修复 DSH；本包不要求用户单独安装
  Node/pnpm。
- **workspace 没出现/首屏要 Choose workspace**：从项目目录启动或设 ${q('DSH_COMPANY_HOME')}；无 workspace
  时 Host 故意不写，等你在 DSH Workspace picker 里选。
- **${q('bundle.json')} 损坏**：host 会停写并保留原文件；从 ${q('$DSH_HOME/company/identity/<id>.json')}
  恢复或备份后让 host 重建。
- **回退**：备份整个 home + workspace；用同一个安装入口装回上一个版本；0.6.0 不自动降级状态文件。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 刷新后什么都没出现 | 浏览器不热加载模块：重启 profile（Desktop 重启 App），再硬刷新页面 |
| 两个公司看到彼此的历史 | 复用了同一个 ${q('DSH_HOME')}：新开 home |
| 浏览器首屏要求 Choose workspace | 启动时没有 workspace：从项目目录启动、设 ${q('DSH_COMPANY_HOME')}，或在 picker 里选 |
| 公司数据停写 | workspace 落点不安全 / ${q('bundle.json')} 坏 / lease 冲突：看启动输出 |
| 成员会话内容被截断 | host 手册注入预算不足：看 pack README 与 ${q('handbook-budget')} 门禁 |
| 五角色报 ${q('browser-use-def ... never started')} | 没装 browser 两包却设了 ${q('DSH_COMPANY_BROWSER=on')}：装包或 unset/off |
| 升级后页面还是旧模块 | 重启 profile + 硬刷新；浏览器模块不热加载 |
`
}
