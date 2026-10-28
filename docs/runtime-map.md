# 运行态地图：一次公司运行从代码到证据的时序与状态轴

> 性质：顶层合同——profile / bundle / preset / session / cwd / 日志 / workspace / snapshot 的**时序关系**与
> **四条状态轴**的唯一家（RFC entry-runtime-map 2026-10-05 立）。什么时候读 = 排查运行链时序、确认某状态在哪条轴、或分不清「现场 vs 证据」时。空间导航 = [项目地图](project-map.md)；
> runtime/ 运行残留逐件 owner = [runtime/README](../runtime/README.md)、run/ 启动配置 = [run/README](../run/README.md)；证据政策 = [testing.md](testing.md)；
> 四种会话形态 = [presets.md](presets.md) 四形态矩阵。

## 一、完整 Web 链（时序）

```text
repo（pnpm dsh；代码唯一权威 = vendor/dsh 钉 SHA 只读）
  → profile boot（$DSH_HOME/profiles/<名>）
  → 组合层：bundles → profile patch → home patch → --patch overlay → telemetry
  → company-pack（bundle 装配行 + 五 preset 声明）
  → **run bundle 身份**（首次 apply：`<DSH_HOME>/bundle.json` = id / pack 版本 / 基部指纹；
     一次安装 = 一个 home = 一个 bundle，不是 git 面）
  → Web host（共享行：team / present / company-client = host 入口）
  → 浏览器 client（client 入口：品牌 / 卡片 / 公司视图页签）
  → 人连接工作区（session cwd = bundle 的 workspace，默认 `<DSH_HOME>/company-workspace`）
  → session/create（选 agentPreset）
  → preset persona / 工具 / skills 进会话（自包含组合，无继承；spawn 成员例外见下段）
  → vendor agent loop（机制属 vendor，本仓不拥有）
  → 会话日志（$DSH_HOME/sessions/<slug>/<id>/；世代选择唯一口径 = session-log-generation）
  → workspace 产物（手册 / KB / drafts / final / journal）
  → 证据（smoke / probe / audit / replay / snapshot）
```

并列的三种面别混：**headless 通用 CLI**（无 preset 装配——只证明 CLI 本身）；**Web 观察窗**（完整公司面）；
**会话四形态**（独立 preset 根会话 / CEO Lead / teammate / 命名 child——来源矩阵见
[presets.md](presets.md)；**名字像 VP-Eng ≠ 加载了 VP-Eng preset**；spawn 成员**继承 Lead 组合**
≠ 根会话的「自包含、无继承」——分水岭 = [roles-isolation §2](design/roles-isolation.md)）。

## 二、四条状态轴（权威位置、生命周期、不能从这里推断什么）

| 轴 | 权威位置 | 生命周期 | 不能从这里推断什么 |
|---|---|---|---|
| 代码与构建 | `vendor/dsh`（钉 SHA 只读）、company-pack `src/` → `lib/`（generated） | 源码长期；lib 为构建产物 | 改 src ≠ 浏览器已重建（须重跑构建） |
| DSH 运行状态 | `runtime/harness-home/`（dev bundle 的 home；+ 第二 home；逐件 = [runtime/README](../runtime/README.md)） | gitignored、按 profile/session 生成 | 不是公司业务事实，也不是证据快照 |
| 会话事实与业务产物 | `company-workspace/`（dev bundle 的 workspace，由 session cwd 决定；**gitignored**） | live 共享盘持续演进 | 不是排练盘，不是历史证据，也不是产品源码 |
| 验证与历史证据 | `snapshots/<类型>/<场景>/` | 按场景冻结或追加 | 场景在场 ≠ 可执行 replay；`workspace.expected` ≠ 总是独立 oracle（来源性质政策 = [快照规则](../snapshots/README.md)） |

## 二·五、run bundle（安装单元）与 run trace（运行追溯）

**run bundle = 一次安装的运行单元**：`bundle.json` + 一个 DSH home + 一个 company workspace。
一次安装一个 bundle；第二个 CEO **新开一个 `DSH_HOME`**，不复用（会话 / 凭据 / 方法层 / workspace 登记都在 home 里）。
bundle **不在 git**：本仓的 `company-workspace/` 是 dev bundle 的 workspace（整树 ignored，制度件符号链接指回 pack），
`runtime/harness-home/` 是同一个 dev bundle 的 home。

| 层 | 内容 | 谁维护 | 进 git | 随包 | 升级 |
|---|---|---|---|---|---|
| 基部 | persona / skills；手册 / 章程起步 / org / 模板 / 起动件 | 维护者 | ✅（pack 源；**不含部署历史**） | ✅ | 随 pack；落盘后未改的替换、改过的保留 |
| 扩张 | 方法层（`<DSH_HOME>/company/methods/<role>/`；旧 profile 路径只读留一版） | 用户（`/cultivation adopt`） | ❌ | ❌ | 不擦 |
| 扩张 | CHARTER 历史纪要、journal、培养记录、交付物、台账、owners、sessions | 公司角色 / 用户 | ❌ | ❌ | 不动 |

**run trace** = 原来那张「一次运行 = 四件套」的可追溯视图（代码与组合 / DSH 运行状态 / 会话 cwd / 证据），
**引用** live bundle 与 `snapshots/`，不复制（合同 = [snapshots/README](../snapshots/README.md)「Run trace 引用合同」）。
`pnpm orient --scenario` 看冻结场景；live 运行看 `pnpm orient` 全景。**别把 run trace 复制成目录**——那是否决过的第二权威。


补充轴（如实登记，不属四主轴）：排练盘 `runtime/rehearsal-workspace/`、浏览器 localStorage（按 origin 隔离）、
系统 tmp 出口（[runtime/README §三](../runtime/README.md)）——三者不是同一类状态，别拿一轴推断另一轴。

## 三、错误入口（首跑常踩）

- `pnpm dsh --profile headless` 只证明通用 CLI；**公司完整操作走 Web profile**（空间细节 = [项目地图](project-map.md)）。
- 未 `source run/env.sh` 时 `DSH_HOME` = 日用 `~/.dsh`——那里**另有同名 `web` profile**（起得来、不报错、
  五角色一个不出现）；开门步骤唯一家 = [demo.md §前置](demo.md)。
- 已删除的退役 profile：dev home 曾有 `profiles/company`（file: 旧形状）——2026-10-05 裁决删除（零功能消费面终核 + 48M 死重）；**若再现同名目录即为异常**（墓碑记录 = [runtime/README](../runtime/README.md) 运行态表）。
- **fresh clone 没有 `company-workspace/`**（整树 gitignored）⇒ 先 `pnpm bundle:init`（建骨架 + 制度件符号链接；
  已有盘一个字节不动）。没有它 = 没有会话 cwd，orient/audit 也没有盘可读。
- **同一个 `DSH_HOME` 不要装第二个 CEO**：sessions / `.credentials.yaml` / profile 方法层 / workspace 登记都在 home 里，
  复用即共享历史。第二个 CEO = 新 `DSH_HOME` = 新 bundle。
- 进程 cwd ≠ 会话 cwd；启动成功 ≠ 五角色已装配（挂载证据 = preset-smoke，[tests/README](../tests/README.md)）。

## 四、五问直达

| 问 | 唯一入口 |
|---|---|
| 怎么启动公司运行 | [demo.md §前置](demo.md)：source env → `pnpm dsh web` → token URL → 连工作区 → CEO 会话 |
| 改哪里 | [项目地图 · 按任务进入](project-map.md) + [pack owner 表](../packages/company-pack/README.md) + [四形态矩阵](presets.md) |
| 用什么局部验证 | [tests/README](../tests/README.md)「改动面 → 最窄检查」+ [testing.md §2](testing.md) |
| 运行卡点先查什么 | [项目地图 · 交互与调试入口](project-map.md) 现象表 + [开发环 §2](guides/dev-loop.md) 调试阶梯 |
| 产物与证据从哪来 | 本图 §一（日志与 workspace）+ §二·五（run bundle / run trace）+ [快照规则](../snapshots/README.md)（含 Run trace 引用合同） |
