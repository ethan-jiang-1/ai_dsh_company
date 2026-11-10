# 架构地图：组合层、repo 形态与改动入口

> 什么时候读：想懂公司怎么组装、组合层怎么分层，或改机制前。这是**有序地图**，不是设计理由——
> 为什么选 A 不选 B 住 `notes/implemented/`（文末四篇 Note）；当前语义的 owner = `contracts/`。
> 总入口 = [index.md](./index.md)；决策台账 = [reference/decisions.md](./reference/decisions.md)。

## 一句话

独立 repo + `vendor/dsh` 钉 SHA submodule + **一个 company pack**（唯一发布载体）+
`company-workspace/` 共享盘 + 双 home。角色 = agent preset，不是插件包；协作走 DSH 已有的
delegation / Agent Teams / workflow，不自造调度器。

## 组合层：package → bundle → profile → preset → session

| 层 | 载体 | 回答什么 | 本仓对应 |
|---|---|---|---|
| 代码包 | npm 包，导出 Cordis 插件 | 有没有**新代码** | 只在角色需要专属工具时出现 |
| bundle | `dsh.bundle.patch` 数组（`cordis.patch.yml` + 11 个 preset 文件） | 装进来默认加哪些**行** | company pack 的 host 共享行 + 每个 preset 行 |
| profile / patch | `$DSH_HOME/profiles/<p>` | 部署级组合选择 | `company` profile；GUI 安装落当前 profile |
| **agent preset** | 一个目录一个 `agent.cordis.yml` | **一个会话**挂什么（工具 / prompt sections / skills / persona） | 每个角色一个 preset |

依据：vendor `docs/architecture.md` 的组合链；`packages/preset/README.md`。

## repo 形态

独立 repo + `vendor/dsh` 钉 SHA submodule + 单 company-pack + `company-workspace/` 共享盘 + 双 home
（日用 `~/.dsh` 不动，开发 `DSH_HOME=runtime/harness-home`，`run/env.sh` 兜底）。目录逐件 owner =
[project-map.md](./project-map.md)；启动链与状态轴 = [runtime-map.md](./runtime-map.md)。

## 角色 = preset，不是插件

一个 pack 提供“公司”的全部能力：host 层共享行 + N 个角色 preset + 共享 KB + 模板。角色 preset
**自包含声明工具行**（DSH 无 patch 继承）；pack 的 `cordis.patch.yml` 只负责全局行（registry roster、
team 两行、present）。名册与四形态 = [contracts/presets.md](./contracts/presets.md)；
host 行 = [contracts/profile.md](./contracts/profile.md)；工具面 owner = `presets/<role>/agent.cordis.yml`。

## 协作通道（四条，选着用）

| 通道 | 机制 | 适合 | 合同 |
|---|---|---|---|
| A 命名委托 | `tool-subagent` + `agentPreset`；activation；相邻层级 | 一次性出稿、深挖 | [contracts/delegation.md](./contracts/delegation.md) |
| B Agent Teams | Lead + teammates、任务板、邮箱、团队工具 | 会议、互审、持续对话 | 同上 |
| C dsh-sdk 子进程 | 完整独立 runtime，one-shot | 硬隔离编排 | 同上 |
| D Workflow | vp-eng 同身份扇出，父收 JSON | 并行取证 / 覆盖审计 | 同上 |

隔离与继承的分水岭（composition 机会性继承、skills per-preset layer、team 软隔离）=
[roles-isolation Note](../notes/implemented/2026-11-10-roles-isolation-rationale.md)；
为什么选这四条 = [architecture Note](../notes/implemented/2026-11-10-architecture-rationale.md)。

## KB 三载体

| 性质 | 载体 | 机制 |
|---|---|---|
| 随包角色知识 | 各 preset 的 `skills/` | per-preset layer，硬隔离 |
| 公司共享手册 | `content/AGENTS.md`（T0）+ `content/generic/*`（T2） | host `systemPrompt.section` 注入 T0；T2 按需读 |
| 活数据 | workspace 文件 + fs 工具 | 共享 checkout；最终产物用 `present` 标记 |

边界与“spill store 不是公司记忆”等细节 = [roles-isolation Note](../notes/implemented/2026-11-10-roles-isolation-rationale.md)；
数据落点 = [contracts/data-model.md](./contracts/data-model.md)。

## 改动入口

- 角色内容（persona / skills）：[contracts/presets.md](./contracts/presets.md) + `presets/<role>/`。
- host 组合 / 安装：[contracts/profile.md](./contracts/profile.md) + [contracts/release.md](./contracts/release.md)。
- 委派 / 团队：[contracts/delegation.md](./contracts/delegation.md)。
- 运行态 / 时序：[runtime-map.md](./runtime-map.md)。
- 验证：[testing.md](./testing.md) + [tests/README](../tests/README.md)。
- UI 层为什么这样：[ui-demo Note](../notes/implemented/2026-11-10-ui-demo-rationale.md)。
- 角色内容为什么这样：[role-content Note](../notes/implemented/2026-11-10-role-content-rationale.md)。

## 升级触发

- 角色长出独立演化的自定义代码 → `company-pack` 内拆内部包（发布载体仍是 pack）。
- 长出一窝专家 → 升 FAQ 13 方案 D：`packages/<one-expert>/` + registry + templates。
- 要给 DSH 上游提 seam → 方案 B 通道进 DSH repo 做，本 repo 只留消费者。

## 相关

- 四篇理由 Note：[architecture](../notes/implemented/2026-11-10-architecture-rationale.md) ·
  [roles-isolation](../notes/implemented/2026-11-10-roles-isolation-rationale.md) ·
  [ui-demo](../notes/implemented/2026-11-10-ui-demo-rationale.md) ·
  [role-content](../notes/implemented/2026-11-10-role-content-rationale.md)。
- 文档层规矩：[docs/AGENTS.md](./AGENTS.md)；文档地图：[index.md](./index.md)。
