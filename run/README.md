# run/ —— 运行面（tracked 启动配置，非运行态）

> 2026-10-06 条目 A拆分（RFC driver-surface-package）；2026-10-07 S1 起改名 run/（RFC
> [driver-purpose-top-level](../notes/archived/2026-10-07-driver-purpose-top-level.md)）：
> 本目录只收「怎么启动」的 tracked 配置；跑过留下的状态一律住 [runtime/](../runtime/README.md)
> （gitignored 运行残留，逐件 owner = 其 README）。双 home 纪律与机制 =
> [architecture §6](../docs/design/architecture.md)；进入开发环境 = `source run/env.sh`
> （双 home 兜底 + 裸 `dsh` 拦截 + pre-push 接线，幂等）；全链时序 = [运行态地图](../docs/runtime-map.md)。

## run bundle（安装单元）与 run trace（一次运行的追溯视图）

**run bundle = 一次安装**：`bundle.json`（`<DSH_HOME>/bundle.json`）+ 一个 DSH home + 一个 company workspace。
一次安装一个 bundle，**不在 git**；第二个 CEO 新开 `DSH_HOME`。本仓的 dev bundle = home `runtime/harness-home/`
+ workspace `company-workspace/`（整树 gitignored；制度件符号链接指回 pack，`pnpm bundle:init` 建）。
定义与 base/grown 分层唯一家 = [运行态地图 §二·五](../docs/runtime-map.md)。

**run trace = 一次运行的四件套**（引用不复制）：

| 件 | 权威位置 | 本目录相关件 |
|---|---|---|
| 代码与组合 | `vendor/dsh`（钉 SHA）+ company-pack（bundle 行 + 五 preset） | —— |
| DSH 运行状态 | `runtime/harness-home/`（dev bundle home；第二 home = `harness-home-b/`） | `env.sh` 选定它 |
| 会话 cwd | `company-workspace/`（dev bundle workspace；排练 = `runtime/rehearsal-workspace/`） | `env.sh` 设 `DSH_COMPANY_HOME` |
| 证据 | `snapshots/<类型>/<场景>/` | —— |

一条命令看当前实况：`pnpm orient`（keyless 只读；场景视图 `--scenario <kind>/<场景>`）。
bundle 身份/基部指纹看 `<DSH_HOME>/bundle.json`；首次 apply 写、只创建不覆盖。

## 件

| 件 | 是什么 |
|---|---|
| `env.sh` | 进入开发环境的唯一入口：双 home 兜底（`DSH_HOME` → `runtime/harness-home/`）、`DSH_COMPANY_HOME` → dev workspace、裸 `dsh` 拦截（`DSH_HOME` 只护数据层护不住代码层）、pre-push 门禁接线 |
| `company.overlay.yml` | headless 动议实验 overlay（向无 web-app 行的组合补公司行） |
| `entry-probe.patch.yml` | entry-probe 用的 overlay |
