# run/ —— 运行面（tracked 启动配置，非运行态）

> 2026-10-06 条目 A拆分（RFC driver-surface-package）；2026-10-07 S1 起改名 run/（RFC
> [driver-purpose-top-level](../notes/proposed/2026-10-07-driver-purpose-top-level.md)）：
> 本目录只收「怎么启动」的 tracked 配置；跑过留下的状态一律住 [runtime/](../runtime/README.md)
> （gitignored 运行残留，逐件 owner = 其 README）。双 home 纪律与机制 =
> [architecture §6](../docs/design/architecture.md)；进入开发环境 = `source run/env.sh`
> （双 home 兜底 + 裸 `dsh` 拦截 + pre-push 接线，幂等）；全链时序 = [运行态地图](../docs/runtime-map.md)。

## 一次运行 = 四件套（run bundle 的显性面）

「跑起这家公司」由四件状态合起来回答；逐轴权威唯一家 = [运行态地图 §二](../docs/runtime-map.md)，此处只导航不复制：

| 件 | 权威位置 | 本目录相关件 |
|---|---|---|
| 代码与组合 | `vendor/dsh`（钉 SHA）+ company-pack（bundle 行 + 五 preset） | —— |
| DSH 运行状态 | `runtime/harness-home/`（第二 home = `harness-home-b/`） | `env.sh` 选定它 |
| 会话 cwd | `company-workspace/`（排练 = `runtime/rehearsal-workspace/`） | —— |
| 证据 | `snapshots/<类型>/<场景>/` | —— |

一条命令看当前四件套实况：`pnpm orient`（keyless 只读；场景视图 `--scenario <kind>/<场景>`）。

## 件

| 件 | 是什么 |
|---|---|
| `env.sh` | 进入开发环境的唯一入口：双 home 兜底（`DSH_HOME` → `runtime/harness-home/`）、裸 `dsh` 拦截（`DSH_HOME` 只护数据层护不住代码层）、pre-push 门禁接线 |
| `company.overlay.yml` | headless 动议实验 overlay（向无 web-app 行的组合补公司行） |
| `entry-probe.patch.yml` | entry-probe 用的 overlay |
