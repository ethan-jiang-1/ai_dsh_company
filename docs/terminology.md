# 术语映射：本项目用法 ↔ DSH 官方 ↔ vendor/dsh 源码直达

> 性质：导航层查表——概念 → 官方载体 → 源码路径一步到位（路径均核实存在于钉住 tag）。
> 何时读：新会话查 DSH 机制、或分不清本项目用词与 DSH 官方词时。2026-10-12 自 index 整节迁出
> （常驻层瘦身轮：index 的行数下限被登记表绑定，查表面不占它的头寸；登记见 index §现有文档）。

探索路由（进 vendor 树）：`vendor/dsh/docs/architecture.md` → `docs/capability-seams.md` → 具体 package README——机制结论的权威在 vendor 树。

| 本项目 | DSH 官方 | vendor/dsh 落点（读源码从这进） |
|---|---|---|
| 角色（CEO/VP…） | agent preset（`presets/<id>/agent.cordis.yml` + persona + skills） | `packages/preset/agent-preset`（每预设一行声明，rc.2 形）+ `packages/preset/persona`；出厂范本 = `packages/bundle/web-app/presets/` |
| 组织/公司 | 一个 host profile + preset roster（rc.2：`agent-preset-registry` 装配，roots 目录扫描已废） | `packages/preset/agent-preset-registry`（default 装配）+ `docs/architecture.md`（组合链）；升 pin 迁移实证 = [pin-upgrade-0.2.0](../notes/implemented/2026-09-30-pin-upgrade-0.2.0-rc.2.md) |
| worker（角色底下干活的一次性代理） | one-shot subagent（`dsh-tool-subagent`，spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 派活/汇报线 | 命名委托工具（通道 A / M2） | 同上（per-instance persona 教义在其 README） |
| 会议/任务板/邮箱 | Agent Teams（`ctx.agentTeams`，experimental） | `packages/experimental/agent-team` + `packages/experimental/tool-agent-team` + `docs/subsystems/agent-team.md` |
| 通道 A/B/C/D（机制） | 命名委托 / Agent Teams / dsh-sdk 子进程 / workflow 脚本（architecture §3） | [architecture.md](./design/architecture.md) §3 篇首映射表（各通道包清单） |
| M1–M4（用法/编排） | 人中继 / 隔离委托 / SDK 编排器 / 团队（roles-isolation §3） | [roles-isolation.md](./design/roles-isolation.md) §3 选型速查 |
| 公司页签 / 公司视图 | 右栏公司页签（可 `float()` 拖出成浮窗）+ 整页视图（`conversation.view` 条目；命名原则 = ui-demo §5）——页签清单 = 客户端注册面（[src/client](../packages/company-pack/src/README.md)），随切片增长、不在此枚举 | `packages/client/ui-sidebar-right`（tab 注册与浮窗）+ `docs/subsystems/sidebar-right.md` + `packages/client/ui-dockkit`（浮窗手势） |
| 交付物 | `present` 工具的 explicit deliveries（ui-demo §1） | `packages/client/ui-deliverables` |
