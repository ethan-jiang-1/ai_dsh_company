# Host 与共享纯逻辑架构（`src/host/` + `src/lib/`）

> **读法**：理解或修改 `company-pack` 的 Node 宿主半（host）与共享纯逻辑层（lib）架构时读。
> 上游总纲 = [architecture.md](../architecture.md)；模块文件索引 = [src/README](../../packages/company-pack/src/README.md) · [src/host/README](../../packages/company-pack/src/host/README.md)。

## 1. 分层与依赖方向

```text
vendor/dsh 运行时（Cordis loader）
        │  inject: ['tools', 'approval', 'commands', 'workspaceRegistry']
        ▼
packages/company-pack/src/index.ts      ← 唯一 host 入口（只导出 apply / inject）
        │
        ├──► src/host/                  ← Node-only 能力组（按关切分目录，组清单 = 目录本身）
        │         │
        ▼         ▼
        src/lib/                        ← host / client 共享纯逻辑域（零 Node 内建）
```

- **单向分层**：`host` → `lib` 单向；`client` 禁止 import `host`（`src-layering` 门禁强守）。`src/lib/` 同时被 `tsconfig.client.json` 编译，严禁引入 `node:*` 内建模块。
- **单一事实派生**：`src/lib/` 的 8 个域各自拥有纯解析与读模型逻辑，`tests/lib/` 与之同名镜像（`mirror.spec.ts` 守卫）。

## 2. Host 能力骨架（`src/host/`）

`apply(ctx, config)` 在 `src/index.ts` 中按启动时序编排以下能力组（完整组/文件映射见 [src/host/README](../../packages/company-pack/src/host/README.md)）：

| 关切域 | 核心目录 | 职责与架构边界 |
|---|---|---|
| **启动与公司盘生命周期** | `run-bundle/` · `workspace/` | 解析 workspace（`DSH_COMPANY_HOME` → cwd → 最近选择 → DSH picker）；执行首启只补缺播种（`planBootstrap` / `applyBootstrap`）、编制缺口回填（`backfillWorkspaceRoles`）、v3 身份写入（`bundle-manifest`）、单 writer 租约（`lease`）及 DSH `workspaceRegistry` 登记与搬家体检 |
| **提示词、策略与语言桥** | `prompt/` · `startup/` · `language/` | 注入 T0 公司手册（`handbook.ts`，排除非角色 preset）、workflow/delegation 合同、工作语言策略；维护 `.dsh-company/startup.json` → `startup-options.json` 派生与 `StartupOptionsWatch`、触发 `createPresetHealth` 在启动日志点名 broken preset；经 `settings.describe()` 桥接 live `zh`/`en` 语言偏好 |
| **委派与座位治理** | `delegation/` | 在根会话被团队版 shadow 时提供 `list_subagents`/`send_to_subagent` 控制面（`delegation-control`）、workflow 后台 durable 视图（`workflow-runs`）、`subagent_retry` 同步重试原语、turn 终态投影，以及阻止 support preset 调团队工具的 `team-seat-guard` |
| **账本、成品目录与培养** | `ledger/` · `cultivation/` | 维护 home 级 `presented` 审计账本（`presented-domain` / `presented-ledger`），监听 `deliverables/presented` 与会话回扫以重建派生索引 `deliverables-index.json` 与 `exports/`；承接 `cultivation_propose` 工具、`/cultivation` 命令、home 级方法层迁移/存储及撤销日志 |
| **人侧命令、签字与基础件** | `commands/` · `fs/` · `logging/` | 注册 `/req`、`/prd`（含 `present` 前 `prd-gate`）、`/delivery`、`/deliverables`、`/company-settings`、`/company-diagnostics`；注册双语 `request_signoff` 工具；提供安全普通文件判据（`safe-file`）与有界轮转日志（`rotating-log`） |

## 3. Lib 共享纯逻辑域（`src/lib/`）

| 域 | 管什么 |
|---|---|
| `presence/` | 在场状态、看板（board）、依赖图（dag）、工卡状态推导与工作区门投影 |
| `cultivation/` | 培养记录解析、方法 slug 校验、上下文引用（`cultivation-context`）与状态汇总 |
| `docs/` | MRD/PRD/StRS 标题与 JSON 台账解析、需求编号追溯与文档形状判据 |
| `deliverables/` | 成品目录索引解析、地址编码（`sessionFileAddress`）与交付物路径规范 |
| `delegation/` | 委派能力面（`SUBAGENT_RETRY_SURFACE`）、工具键映射与重试策略 |
| `startup/` | 启动策略字段校验（`productType` / `deliveryMode` / `wiki`）与选项模型 |
| `accounting/` | 账本模型、预算口径与双语 `request_signoff` 理由结构化解析（`signoff.ts`） |
| `shared/` | 跨域叶子（如 `run-bundle-paths.ts`、`role-copy.ts`、`text.ts`）；准入标准 = 删除后复杂度散回至少两个域 |

## 4. 关键不变量

- **不写死用户盘事实**：`content/` 为随包只读源，`.dsh-company/` 只补缺不覆盖；方法层与 `presented` 账本保留在 `$DSH_HOME/company/`（[data-model.md](./data-model.md)）。
- **无 workspace 零写入**：boot 未解析到合法 workspace 时，`dataBlocked` 成立，应用可启动但公司数据写面全部阻断。
- **双编译面产物**：`src/index.ts`、`src/host/` 与 `src/lib/` 经 `tsc -b` + `tsdown` 输出至 `lib/index.js`（gitignored；构建顺序见 [guides/bootstrap.md](../guides/bootstrap.md)）。
