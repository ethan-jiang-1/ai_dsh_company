# ai_dsh_company · 梦之队

**插件即产品**：一个 DSH bundle（`packages/company-pack`）提供五个角色 preset（CEO / VP-Eng /
VP-Sales / COO / CFO）+ 委派子人格 `researcher`。它装进一个 named profile，启动后在**用户指定的
workspace** 里做事；插件内容全部在包内，生产状态与最终 artifacts（run bundle）全部在 workspace。

- **安装尊重 DSH**：默认在 DSH **Plugins** 页安装（`dsh web` 与 Desktop 同一句）；CLI
  `dsh plugin --profile company add <tgz>` 只是 web 自动化，不能管 `desktop`。
- **入口是 named profile**：`cd /path/to/your-project && dsh --profile company`。没有 package bin，
  没有第二层 launcher；workspace 从启动 cwd / `DSH_COMPANY_HOME` / 已保存选择来，没有就由 DSH
  Workspace picker 问。
- **插件内容在包内**：persona / skills / host / client / 公司手册 / 模板 / 默认章程随包发布，只读。
- **run bundle 在 workspace**：`<workspace>/.dsh-company/` 一个目录装下 `kb/`、`deliverables/`、
  `cultivation/`、日志、治理导出与 `bundle.json`（v3）；workspace 根不再出现产品文件。
- **home 只留 DSH 运行时 + host 治理**：sessions / 凭据 / workspace 登记 / lease / 方法层 /
  presented 账本 / 身份备份。方法层与账本刻意不搬进模型可写区（D25/M2）。
- **一安装 = 一个公司，顺序多个 workspace**：换项目不新建 home、不重装；不同公司才用不同
  `DSH_HOME`。并发多 workspace 后置。

## 安装

**GUI（默认）**：在 DSH **Plugins** 页的 **Add plugin** 安装（web 与 Desktop 通用）：已发布版本
输入包名 `dsh-company-pack`；本仓 `_dist` 交付在未 publish 时粘贴 tarball 绝对路径。按提示重启 profile。

**CLI（仅 `dsh web` 自动化）**：

```sh
export DSH_HOME="$HOME/.dsh-company/<你的公司名>"
dsh --profile company --from-default-profile web --dump-default-config   # 仅首次
dsh plugin --profile company add /path/to/dsh-company-pack-<version>.tgz   # 或包名@<version>
```

装完重启 `dsh --profile company`。三个成功分开核：安装命令成功 → dependency 写入 → 进
`dsh.profile.bundles`；只有第三个让功能存在。前置只需 DSH 已安装且版本在窗口内；不需要用户
单独安装 Node/pnpm。**不要**在 Desktop 上用 `dsh plugin --profile web`
（装错 profile）；CLI 也不能管理 `desktop`。

## 启动与 workspace

```sh
cd /path/to/your-project
dsh --profile company
# 或：DSH_COMPANY_HOME=/path/to/your-project dsh --profile company
```

优先级：`DSH_COMPANY_HOME` → 启动 cwd（合理的项目目录）→ `<DSH_HOME>/company/settings.json` 的最近
选择（便利提示）→ DSH Workspace picker。没有 workspace 时 Host 不写盘；Host boot
不等用户。**没有 `--workspace` flag，也没有终端 TTY 询问。**

首启是 DSH 的 token 门（无 token 401；带 token 303 + HttpOnly cookie → SPA），原生没有欢迎页；
第一次看到什么由 DSH Web 的 Workspace picker 回答（本包不自建 onboarding）。Desktop 不依赖 `welcome-notice`。

## 数据布局

| 平面 | 放什么 | 谁拥有 |
|---|---|---|
| 插件包 `packages/company-pack/**` | presets、`src/host`、`src/client`、`content/`（手册/模板/默认章程/状态默认值） | 维护者；随包版本，只读 |
| 产品 home `<DSH_HOME>` | `profiles/company`、sessions、凭据、workspace 登记、lease、`company/methods/`、`company/ledger/`、`company/identity/` | DSH + host 治理 |
| 用户 workspace | `<workspace>/.dsh-company/`：`kb/`（公司/org/owners/台账/章程/journal）、`deliverables/`、`cultivation/`、`logs/`、`exports/`、`overrides/`、`bundle.json`（v3） | 用户；可携带的 run bundle |

用户项目自己的 `AGENTS.md` / `CLAUDE.md` 仍由 DSH `agent-instructions` 加载；公司手册从 pack
`content/AGENTS.md` 注入 system prompt，不复制到 workspace。模板默认读 pack；要改就放
`.dsh-company/overrides/`。

## 维护者 dev

```sh
git submodule update --init && corepack enable pnpm && pnpm install
pnpm bundle:init                 # 建 dev workspace（已有盘一个字节不动）
source run/env.sh                # dev home + 裸 dsh 拦截
pnpm company --no-open           # dev-only：exec `dsh --profile company`（不建 profile/不装包/不问 workspace）
```

`pnpm company` 只是 repo dev wrapper，不进 tarball；产品入口永远是 `dsh --profile company`。
`pnpm verify` / `pnpm test` / `pnpm typecheck` 是常驻三条命令。

**分发**：`_dist/安装手册.md`（生成物）与 tarball 是唯一收件人路径；安装形状、升级、备份、卸载、
回退见 [_dist/安装手册.md](./_dist/安装手册.md) 与 [docs/release.md](./docs/release.md)。

**入口**：[项目地图](./docs/project-map.md) · [运行态地图](./docs/runtime-map.md) ·
[profile 合同](./docs/profile.md) · [数据模型](./docs/data-model.md) · [发布合同](./docs/release.md) ·
[驾驭者七问](./docs/orient.md) · [AGENTS.md](./AGENTS.md)（coding agent）。

**版本说明**：0.6.0 是 run bundle 布局的破坏性改版（`.dsh-company/` 统一收口、无 launcher）。0.5.0
的根目录骨架不自动迁移；旧文件原样保留，请在新 workspace 重新开始，或按手册手工搬 `.dsh-company/`。
