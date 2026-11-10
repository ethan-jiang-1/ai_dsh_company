# profile · host 组合的现在时（company）

> 什么时候读：改 host 组合、换部署形状（Plugins 安装 vs dev）时。路线 = 形状表 → host 行清单 → 开放点。
> 合同：部署形状与 host 行清单语义。行清单源文件（bundle 层）：
> [packages/company-pack/cordis.patch.yml](../../packages/company-pack/cordis.patch.yml)。
> 插件只读内容 = [content/](../../packages/company-pack/content)；公司状态 = `<workspace>/.dsh-company/`。
> 设计依据 [design/architecture.md](../design/architecture.md) §6。

## 安装形状

| 形状 | 入口 | 状态 |
|---|---|---|
| **应用内安装（默认）** | DSH **Plugins** 页安装 `dsh-company-pack`（web/Desktop 同一句） | ✅ 跨面；装完重启 profile |
| **CLI web 自动化** | `dsh --profile company --from-default-profile web --dump-default-config` → `dsh plugin --profile company add <tgz>` | ✅ **仅 `dsh web`**；不能 `desktop` |
| **启动** | 装进哪个 profile 就启动哪个：GUI 装进 `web` → `dsh web`/Desktop；固定公司 profile → `cd <workspace> && dsh --profile company`（或 `DSH_COMPANY_HOME`） | ✅ 无 bin；`company` 不是出厂 profile，缺失时 DSH 报错（CLI 用 `--from-default-profile web` 建）；workspace 只从启动 cwd / `DSH_COMPANY_HOME` / DSH picker 解析 |
| **维护者 dev** | `source run/env.sh` → `pnpm company --no-open`（默认 pack + `plugin add file:`；`--link` 快速通道） | ✅ dev home = `runtime/harness-home`，差异表 = [dev-product-parity](../guides/dev-product-parity.md) |
| **通用/旧部署** | 任意 web profile 装本包 | ✅ 兼容形状；不承诺 Desktop shell |

交付形态细节：

- **一个安装 = 一个公司**；同一 home 可顺序服务多个 workspace；不同公司 = 不同 `DSH_HOME`。
  换项目不新建 home/重装。
- **workspace 解析**：`DSH_COMPANY_HOME` → 启动 cwd（合理项目目录）→ `<DSH_HOME>/company/settings.json`
  最近选择 → DSH Workspace picker（本包不自建 onboarding）。Host boot 不等用户；无 workspace 时零写。
- **插件内容只读**：presets/persona/skills/host/client/`content/`（手册/模板/默认章程/状态默认值）；
  **不 seed** 手册/模板到 workspace。
- **公司状态**：`<workspace>/.dsh-company/`（`kb/`、`deliverables/`、`cultivation/`、`logs/`、
  `exports/`、`overrides/`、`bundle.json` v3）。workspace 根无本包写出的文件。
- **home 治理**：sessions/凭据/workspace 登记/lease/`company/methods/`/`company/ledger/`/
  `company/identity/`。方法层与 presented 账本不入模型可写区（D25/M2）。
- **profile 不是隔离单位**：数据隔离靠独立 `DSH_HOME`；同 home 多 profile 共享 sessions/凭据/
  方法层/账本/workspace 登记。
- **安装三成功**：pnpm exit 0 → dependency 写入 → `dsh.profile.bundles`；只有第三个让功能存在。
  装完重启；真启动无 `did not activate`/`skipping profile bundle` 才算挂上。

## host 行清单（bundle 层）

| 行 | 语义 | 状态 |
|---|---|---|
| `agent-preset-registry`（替换出厂行；default: ceo） | 六公司角色 + worker support 各一行 `agent-preset` 声明（`presets/<role>/agent.cordis.yml` 经 `dsh.bundle.patch` 数组并入） | ✅ dump 实测在列 |
| `session-persistence-jsonl` | 会话持久化；team 激活前提 | ✅（base 已有） |
| `tool-present`（insert） | 交付物声明（deliverables 卡片） | ✅ |
| `agent-team` + `tool-agent-team`（insert） | 团队协作主通道（M4/D4） | ✅ |
| `ui-agent-team`（insert） | 团队 Web 可视面 | ✅ |
| `company-client`（insert，`name: dsh-company-pack`） | 本包 host/client 入口：签字、工作区门、培养、公司状态初始化、workspace 登记、handbook `systemPrompt.section`、目录/账本、品牌/公司页签 | ✅ bundle 自带；应用内装即生效 |
| `company-session-search`（insert + isolate 组） | 会话全文检索（provider + `session_search` 工具同组；per profile 落 home cache） | ✅ 组内 provider/tool active；不替换 host 行 |
| `time-context`（preset 内声明） | 日期通道（Asia/Shanghai） | ✅ |

工具行走 preset 的自包含组合，不随 host bundle 增补（R1 实证；机制见
[architecture §6 要点 1](../design/architecture.md)）。**例外 = `company-session-search` 隔离组**：
检索工具必须与 isolated `sessionQuery` provider 同组，所以它由 bundle 全局提供、不再逐 preset 声明；
host 的 `session/search`（侧栏内容搜索）保持出厂 `openAt: never`（有会话时会报禁用），不是本包承诺。
**没有 profile patch registrar**：旧 profile 里的 `company-workspace-register` 行会被忽略/告警，不写新行。

## 已知开放点

- `plugin add` 的行注册顺序：pnpm 成功后 CLI 才写 bundles 列表——若中途失败，重跑 `plugin add`，
  用 `plugin list` 核状态；不要手写 `dsh.profile.bundles`。
- **Team 容量与信箱背压**：`maxMembers`（代码默认 16，官方 bundle 与本仓 patch 钉 8）与
  `maxMessageBytes` 在组合层调；`maxPendingMessagesPerMember` 已删除，本仓 patch 已同步。
- **Desktop**：安装句同 Plugins 页；本机无 Desktop 壳，只做文档与 client 组合矩阵，不冒充真机验证。
