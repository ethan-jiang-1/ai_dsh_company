# run/ —— 运行面（tracked 启动配置，非运行态）

> 本目录只收「怎么启动」的 tracked 配置；跑过留下的状态一律住 [runtime/](../runtime/README.md)
> （gitignored 运行残留，逐件 owner = 其 README）。双 home 纪律与机制 =
> [architecture §6](../docs/architecture.md)；进入开发环境 = `source run/env.sh`
> （双 home 兜底 + 裸 `dsh` 拦截 + pre-push 接线，幂等）；全链时序 = [运行态地图](../docs/runtime-map.md)。

## 公司状态（workspace 单元）与 run trace（一次运行的追溯视图）

**公司状态 = 一个 workspace 的运行单元**：用户 workspace + `<workspace>/.dsh-company/`（v3 身份 +
状态/产物）。**home 不是公司状态的业务部分**：home 只留 DSH 运行时与 host 治理（sessions / 凭据 /
workspace 登记 / lease / 方法层 / presented 账本 / 身份备份）。一个安装 = 一个公司；同一 home 可顺序
服务多个 workspace，换项目不新建 home、不重装；不同公司才用不同 `DSH_HOME`。

公司状态**不进 git**；本仓的 dev 公司状态 = workspace `company-workspace/`（整树 gitignored；`pnpm bundle:init`
只建 `.dsh-company/` 状态；手册/模板住 pack `content/`——host 注入/只读，默认章程与状态首启只补缺），
身份 = `company-workspace/.dsh-company/bundle.json`（v3，legacy 文件名）。定义与 base/grown 分层唯一家 = [运行态地图 §二·五](../docs/runtime-map.md)。

**run trace = 一次运行的追溯视图**（引用不复制）：

| 件 | 权威位置 | 本目录相关件 |
|---|---|---|
| 代码与组合 | `vendor/dsh`（钉 SHA）+ company-pack（bundle 行 + 五 preset） | —— |
| DSH 运行状态 | `runtime/harness-home/`（dev 安装的 home；第二 home = `harness-home-b/`） | `env.sh` 选定它 |
| 会话 cwd / 业务产物 | `company-workspace/`（dev 安装的 workspace；用户侧 = 用户自己的项目目录） | `env.sh` 设 `DSH_COMPANY_HOME` |
| 证据 | `snapshots/<类型>/<场景>/` | —— |

一条命令看当前实况：`pnpm orient`（keyless 只读；场景视图 `--scenario <kind>/<场景>`）。
公司状态清单/基部指纹看 `<workspace>/.dsh-company/bundle.json`；首次 apply 写、只创建不覆盖。
dev 入口 = `pnpm company --no-open`（repo wrapper；默认 pack + `plugin add file:`；`--workspace <dir>`
只是 wrapper 的调试覆盖，不是用户侧命令行参数）；启动入口 = `dsh --profile company`；源码直启（`pnpm dsh`）
需显式 `DSH_COMPANY_HOME`。

## 件

| 件 | 是什么 |
|---|---|
| `env.sh` | 进入开发环境的唯一入口：双 home 兜底（`DSH_HOME` → `runtime/harness-home/`）、`DSH_COMPANY_HOME` → dev workspace、裸 `dsh` 拦截、pre-push 门禁接线 |
| `company.overlay.yml` | headless 动议实验 overlay（向无 web-app 行的组合补公司行） |
| `entry-probe.patch.yml` | entry-probe 用的 overlay |
