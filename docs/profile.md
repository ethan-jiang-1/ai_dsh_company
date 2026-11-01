# profile · host 组合的现在时（company）

> 什么时候读：改 host 组合、换部署形状（源码直跑 vs 安装形态）时。路线 = 形状表 → host 行清单 → 开放点。
> 顶层合同：部署形状与 host 行清单语义。行清单源文件（bundle 层）：
> [packages/company-pack/cordis.patch.yml](../packages/company-pack/cordis.patch.yml)；
> 启动器 = [bin/dsh-company.mjs](../packages/company-pack/bin/dsh-company.mjs)（repo 形态
> `pnpm company`）。设计依据 [design/architecture.md](./design/architecture.md) §6。

## 部署形状（2026-11-01 产品化）

| 形状 | 命令 | 状态 |
|---|---|---|
| **产品安装（推荐）** | 独立 `DSH_HOME` + `dsh --profile company --from-default-profile web` + `plugin add <tgz>` + 启动器 `--workspace <dir>` | ✅ 现行；`company` profile 是产品入口 |
| **维护者 dev** | `source run/env.sh` → `pnpm company --workspace "$PWD/company-workspace"`（或 `pnpm dsh --profile company`） | ✅ 现行；dev home = `runtime/harness-home`，pack 走 `link:` |
| 目录独立启动（旧） | `pnpm standalone [--home] [--workspace]` | ⚠ 旧形状；产品入口改用 `pnpm company` |
| 通用/旧部署 | `dsh --profile web` 装本包 | 兼容，不是产品入口 |
| 组合验证 | `dsh --profile company --dump-config` | ✅（行数与行名以当次 dump 为准） |

产品形状细节：

- **一次安装 = 一个 home + 一个 `company` profile + 一个 workspace**；换项目 = 新 home。
- **workspace 必须显式**：启动器 `--workspace` / `DSH_COMPANY_HOME` / 最近设置 / TTY 询问；
  没有默认 `<DSH_HOME>/company-workspace`。无值且非交互 ⇒ 退出码 2 + 两条命令。
- **profile 不是隔离单位**：数据隔离靠独立 `DSH_HOME`；同 home 多 profile 共享 sessions/凭据/
  方法层/账本/workspace 登记。
- **`--from-default-profile web` 只在 profile 缺失时用**；已有 profile 上再用会替换它的依赖与
  用户 patch。base-only 自定义 profile 缺 `dsh-web-app`，preset 行会 pending。
- **`link:` vs `file:`**：dev `link:` 改 presets 即刻生效；安装 `file:` 是真拷贝，改内容要重装。
  正式形状由 `release-smoke` 验证。

## host 行清单（bundle 层；2026-11-01）

| 行 | 语义 | 状态 |
|---|---|---|
| `agent-preset-registry`（替换出厂行；default: ceo） | 五公司角色 + researcher 各一行 `agent-preset` 声明（`presets/<role>/agent.cordis.yml` 经 `dsh.bundle.patch` 数组并入） | ✅ dump 实测在列 |
| `session-persistence-jsonl` | 会话持久化；team 激活前提 | ✅（base 已有） |
| `tool-present`（insert） | 交付物声明（deliverables 卡片） | ✅ |
| `agent-team` + `tool-agent-team`（insert） | 团队协作主通道（M4/D4） | ✅ |
| `ui-agent-team`（insert） | 团队 Web 可视面 | ✅ |
| `company-client`（insert，`name: dsh-company-pack`） | 本包 host/client 入口：签字、工作区门、培养、目录/账本、品牌/公司页签 | ✅ |
| `session-query-sqlite`（替换） | 会话全文检索（按 profile 文件名） | ✅ |
| `time-context`（preset 内声明） | 日期通道（Asia/Shanghai） | ✅ |
| `company-workspace-register`（**profile patch**，不是 bundle） | boot 时把 `DSH_COMPANY_HOME` 登记进 DSH Workspace；独立 host row + `inject: workspaceRegistry` + async apply | ✅ 启动器写 profile patch；release-smoke 走同一行 |

工具行走 preset 的自包含组合，不随 host bundle 增补（R1 实证；机制见
[architecture §6 要点 1](./design/architecture.md)）。`register-workspace` 放 profile patch 而不是
bundle：pack bundle 会被 Client 组合测试加载，host-only row 会让 client tier 等不存在的服务。

## 已知开放点

- ~~pack 的 runtime deps 精确钉 `0.1.5-rc.2`~~ **已闭（R5a）**：peers + `engines.dsh` + 兼容台账
  （[release.md](./release.md)）。
- `plugin add` 的行注册顺序：pnpm 成功后 CLI 才写 bundles 列表——若中途失败，手动补
  `dsh.profile.bundles`（R1 实证一次）。
- **Team 容量与信箱背压**：`maxMembers`（代码默认 16，官方 bundle 与本仓 patch 钉 8）与
  `maxMessageBytes` 在组合层调；0.2.1 起 `maxPendingMessagesPerMember` 删除，本仓 patch 已同步。
- **一 home 一 workspace** 由启动器强制；直接 `DSH_COMPANY_HOME` 直启仍可用（fallback），
  但换项目应新 home。
