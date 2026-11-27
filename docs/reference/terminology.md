# 术语映射：本项目用法 ↔ DSH 官方 ↔ vendor/dsh 源码直达

> 性质：导航层查表——概念 → 官方载体 → 源码路径一步到位（路径均核实存在于钉住 tag）。
> 何时读：查 DSH 机制、或分不清本项目用词与 DSH 官方词时（自 index 迁出；登记见 index）。
> 探索路由：`vendor/dsh/docs/architecture.md` → `vendor/dsh/docs/capability-seams.md` → 具体 package README——机制权威在 vendor 树。

| 本项目 | DSH 官方 | vendor/dsh 落点（读源码从这进） |
|---|---|---|
| `bundle` / `profile` / `pack` | DSH 的可安装发布单位 / Harness home 的具名组装 / 本仓对 `dsh-company-pack` 的简称；三者不互替 | `vendor/dsh/docs/architecture.md`（profiles and bundles 节）；[profile.md](../contracts/profile.md) |
| 公司状态（company state，代码历史名 `run bundle`）/ `run trace` / 发布物 / 发行版 | `.dsh-company/` 状态根 / 四件套追溯视图 / 单个可下载产物 / bundle+profile+home+surface+生命周期 | [runtime-map.md](../runtime-map.md)；[release.md](../contracts/release.md) |
| 角色（CEO/VP…） | agent preset（`presets/<id>/agent.cordis.yml` + persona + skills） | `packages/preset/agent-preset` + `packages/preset/persona`；出厂范本 = `packages/bundle/web-app/presets/` |
| 组织/公司 | 一个 host profile + preset roster（`agent-preset-registry` 装配） | `packages/preset/agent-preset-registry` + `docs/architecture.md`（组合链） |
| worker（角色底下干活的一次性代理） | one-shot subagent（`dsh-tool-subagent`，spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 派活/汇报线 | 命名委托工具（通道 A / M2） | 同上（per-instance persona 教义在其 README） |
| 会议/任务板/邮箱 | Agent Teams（`ctx.agentTeams`，experimental） | `packages/experimental/agent-team` + `packages/experimental/tool-agent-team` + `vendor/dsh/docs/subsystems/agent-team.md` |
| 原生四通道 / 组织别名 A/B/D | `spawn`（A 命名委托）/ `fork` / `workflow`（D，只在 vp-eng 同身份扇出）/ `team`（B Agent Teams）；C（dsh-sdk）未启用 | [architecture.md](../architecture.md) 协作通道表 + [architecture Note](../../notes/implemented/2026-11-10-architecture-rationale.md) §3 |
| M1–M4（用法/编排） | 人中继 / 隔离委托 / SDK 编排器 / 团队（roles-isolation §3） | [roles-isolation.md](../../notes/implemented/2026-11-10-roles-isolation-rationale.md) §3 选型速查 |
| 公司页签 / 总部（HQ） | 右栏聚合页签（作战板/团队/档案，浮窗交由原生 `<DockLayout>`）+ 左侧全局「梦之队总部」（`sidebar.panellist` + `main`）+ 培养入口（[client-ux](../architecture/client-ux.md)） | `packages/client/ui-sidebar-right` + `packages/client/ui-layout` + `packages/client/ui-dockkit` |
| 交付物 / 成品 | `present` 工具的 explicit deliveries（**成品 = present 过的 final**；三态合同 = demo.md） | `packages/client/ui-deliverables` |
| 观察窗 / 驾驶舱 / 驾驶座 | 人侧 Web 窗口三别名（「驾驶舱」为早期历史称呼，统一称观察窗） | `apps/web`；词表 = [orient.md](../orient.md) |
