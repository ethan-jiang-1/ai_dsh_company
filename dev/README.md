# dev/ —— 启动配置（tracked，非运行态）

> 2026-10-06 条目 A拆分（RFC driver-surface-package）：本目录只收「怎么启动」的 tracked 配置；
> 跑过留下的状态一律住 [runtime/](../runtime/README.md)（gitignored 运行残留，逐件 owner = 其 README）。
> 双 home 纪律与机制 = [architecture §6](../docs/design/architecture.md)；进入开发环境 =
> `source dev/env.sh`（双 home 兜底 + 裸 `dsh` 拦截 + pre-push 接线，幂等）；全链时序 =
> [运行态地图](../docs/runtime-map.md)。

## 件

| 件 | 是什么 |
|---|---|
| `env.sh` | 进入开发环境的唯一入口：双 home 兜底（`DSH_HOME` → `runtime/harness-home/`）、裸 `dsh` 拦截（`DSH_HOME` 只护数据层护不住代码层）、pre-push 门禁接线 |
| `company.overlay.yml` | headless 动议实验 overlay（向无 web-app 行的组合补公司行） |
| `entry-probe.patch.yml` | entry-probe 用的 overlay |
