# 架构总纲：系统分层、组合链、运行态时序与技术入口

> 什么时候读：掌握公司插件的整体技术架构、代码分层、运行链时序、四条状态轴与扩展边界时。
> 内部代码契约 = [host-and-lib.md](./contracts/host-and-lib.md) · [client-ui.md](./contracts/client-ui.md)；子系统语义 = [contracts/](./contracts/)；为什么选 A 不选 B = `notes/implemented/`；总入口 = [docs/README.md](./README.md)；决策台账 = [decisions.md](./decisions.md)。

## 一句话

独立 repo + `vendor/dsh` 钉 SHA submodule + **唯一自写包 `packages/company-pack/`** + `<workspace>/.dsh-company/` 公司状态盘 + 双 home。
角色 = agent preset，不是插件包；协作走 DSH 原生 delegation / Agent Teams / workflow，不自造调度器。

## 1. 组合层：package → bundle → profile → preset → session

| 层 | 载体 | 回答什么 | 本仓对应 |
|---|---|---|---|
| 代码包 | npm 包，导出 Cordis 插件 | 有没有**新代码** | `packages/company-pack/`（host + client） |
| bundle | `dsh.bundle.patch` 数组（`cordis.patch.yml` + 各 preset `agent.cordis.yml`；清单 = `presets/` 目录） | 装进来默认加哪些**行** | company pack 的 host 共享行 + 每个 preset 行 |
| profile / patch | `$DSH_HOME/profiles/<p>` | 部署级组合选择 | `company` profile；GUI 安装落当前 profile |
| **agent preset** | 一个目录一个 `agent.cordis.yml` | **一个会话**挂什么（工具 / prompt sections / skills / persona） | 每个角色与 support 能力一个 preset |

- 角色 preset **自包含声明工具行**（DSH 无 patch 继承）；pack 的 `cordis.patch.yml` 只放全局行（roster、team、present）。名册与四形态 = [contracts/presets.md](./contracts/presets.md)；host 行 = [contracts/profile.md](./contracts/profile.md)。

## 2. 完整 Web 运行链（时序）与四条状态轴

```text
安装（Plugins 页 / CLI web）→ profile boot（$DSH_HOME/profiles/company）
  → 组合层：bundles → profile patch → home patch → --patch
  → company-pack（bundle 行 + preset 声明 + content/ 只读内容）
  → host startup：workspace 解析（DSH_COMPANY_HOME → cwd → saved → none）
  → 公司状态初始化（<workspace>/.dsh-company/ 只补缺；bundle.json v3；不 seed 手册/模板）
  → Web host（team / present / company-client）→ 浏览器 client（品牌 / 卡片 / 右栏聚合页签 / 全局总部 HQ）
  → session cwd = workspace（默认 ceo 会话）→ preset persona / 工具 / skills / handbook section 进会话
  → vendor agent loop → 会话日志（$DSH_HOME/sessions/）+ workspace 产物（.dsh-company/）
  → 证据（smoke / probe / audit / replay / snapshot）
```

| 状态轴 | 权威位置 | 生命周期 | 不能从这里推断什么 |
|---|---|---|---|
| 代码与构建 | `vendor/dsh`（只读）、company-pack `src/` → `lib/`、`content/`（只读） | 源码长期；`lib/` 为构建产物 | 改 src ≠ 浏览器已重建；改 content ≠ workspace 已更新 |
| DSH 运行状态 | `runtime/harness-home/`（dev home；逐件见 [runtime/README](../runtime/README.md)） | gitignored、按 profile/session 生成 | 不是公司业务事实，不是证据快照 |
| 会话事实与产物 | `company-workspace/.dsh-company/`（dev 盘，gitignored）；用户侧 = 用户项目目录 | live 共享盘持续演进 | 不是排练盘，不是历史证据，不是本仓源码 |
| 验证与历史证据 | `snapshots/<类型>/<场景>/` | 按场景冻结或追加 | 场景在场 ≠ 可执行 replay；`workspace.expected` ≠ 独立 oracle |

- **公司状态与 home 边界**：`<workspace>/.dsh-company/` 存业务状态（`kb/`、`deliverables/`、`cultivation/`、`logs/`、`exports/`、`overrides/`、`bundle.json` v3），升级只补缺不覆盖；home 只留 DSH 运行时与治理（sessions、凭据、workspace 登记、lease、方法层、身份备份）。一个安装可顺序服务多个 workspace；不同公司新开 `DSH_HOME`。
- **首跑常见误区**：headless 通用 CLI 不会自动挂载公司 preset；进程 cwd ≠ 会话 cwd；启动成功 ≠ preset 全部挂载（挂载证据 = `checks/lanes/preset.entry.mjs`）；排练盘 `runtime/rehearsal-workspace/` 不混真盘（详见 [run-ops.md](./guides/run-ops.md)）。
- **run trace**：一次运行的四件套追溯视图（引用不复制），契约见 [snapshots/README](../snapshots/README.md)。

## 3. 协作四通道与 KB 三载体

| 原生通道 | 组织别名 / 机制 | 能力面 | 合同 |
|---|---|---|---|
| `spawn` | A 命名委托（`tool-subagent` + `agentPreset`） | 独立 preset、fresh、parent+1 | [contracts/delegation.md](./contracts/delegation.md) |
| `fork` | 命名 child 续写/复核（`subagent_fork`） | 无独立 preset、已完成轮前缀 | 同上 |
| `workflow` | D Workflow（vp-eng 同身份扇出） | 无独立 preset、fresh 分支、parent+1 | 同上 |
| `team` | B Agent Teams（Lead + 任务板 + 邮箱） | 无独立 preset、继承 Lead、fresh/fork | 同上 |

| KB 性质 | 载体 | 机制 |
|---|---|---|
| 随包角色知识 | 各 preset 的 `skills/` | per-preset layer，硬隔离 |
| 公司共享手册 | `content/AGENTS.md`（T0）+ `content/generic/*`（T2） | host `systemPrompt.section` 注入 T0；T2 按需读 |
| 活数据 | workspace `.dsh-company/` 文件 + fs 工具 | 共享 checkout；最终产物用 `present` 标记 |

- 隔离与继承分水岭 = [roles-isolation Note](../notes/implemented/2026-11-10-roles-isolation-rationale.md)；数据落点 = [contracts/data-model.md](./contracts/data-model.md)。

## 4. 本包代码架构（Host / Lib / Client）与改动入口

- **Node 宿主与共享纯逻辑**：[contracts/host-and-lib.md](./contracts/host-and-lib.md) —— `src/index.ts` → `src/host/`（Node-only）→ `src/lib/`（零 Node 内建，host/client 共享）；模块详情见 [src/README](../packages/company-pack/src/README.md)。
- **浏览器端与 DSH 原生扩展**：[contracts/client-ui.md](./contracts/client-ui.md) —— `src/client/index.ts` 经 L0/L1 原生槽位装配右栏聚合页签、左侧全局总部（HQ）、内嵌培养会话、签字 composer 拦截与双语字典，以及 L2/L3 与 CSS 安全红线。
- **角色 / 组合 / 委派 / 发布**：[presets.md](./contracts/presets.md) · [profile.md](./contracts/profile.md) · [delegation.md](./contracts/delegation.md) · [release.md](./contracts/release.md)。
- **验证与文档规范**：[testing.md](./testing.md) · [tests/README](../tests/README.md) · [docs/AGENTS.md](./AGENTS.md) · [docs/README.md](./README.md)。
- **设计理由（为什么）**：[architecture](../notes/implemented/2026-11-10-architecture-rationale.md) · [roles-isolation](../notes/implemented/2026-11-10-roles-isolation-rationale.md) · [ui-demo](../notes/implemented/2026-11-10-ui-demo-rationale.md) · [role-content](../notes/implemented/2026-11-10-role-content-rationale.md)。

## 5. 升级触发

- 角色长出独立演化的自定义代码 → `company-pack` 内拆内部包（发布载体仍是 pack）。
- 长出一窝专家 → 升 FAQ 13 方案 D：`packages/<one-expert>/` + registry + templates。
- 要给 DSH 上游提 seam → 提上游 PR 升 pin，本仓只留消费者（见 [release.md](./contracts/release.md)）。
