# host/ · Node 侧逻辑

> 什么时候读：改 host 行为、找「某件事住哪」、给新文件选家时。
> 文件名 = 一个模块；目录名 = 一个关切。新增文件先归组，跨组 import 走 `../<group>/<file>.ts`。
> **组清单 = 本目录本身**（D28：不抄计数，抄一次漂一次——本表曾写「9 组」而盘上 11 个）。

| 组 | 管什么 | 文件 |
|---|---|---|
| `run-bundle/` | 首启播种（`bootstrap`）、bundle 身份（`bundle-manifest`）、布局（`run-bundle`）、租约（`lease`）、运行前提（`runtime-guard`）、启动配置校验与路径/profile 体检 | bootstrap, bundle-manifest, run-bundle, lease, runtime-guard, config, paths, profiles |
| `workspace/` | workspace 解析、登记体检、工作区门投影 | workspace-resolution, workspace-registry, workspace-doors |
| `cultivation/` | 培养提案/命令、记录与方法层存储、背景读取、撤销恢复日志 | cultivation, cultivation-storage, cultivation-context-read, revoke-journal |
| `ledger/` | presented 审计账本与状态通道、成品目录生成/读取、治理导出 | presented-ledger, presented-domain, catalog, catalog-state, governance-export |
| `delegation/` | child 控制面、turn 终态投影、重试原语、workflow run durable 视图、团队座位守卫 | delegation-control, delegation-terminal, subagent-retry, workflow-runs, team-seat-guard, seat |
| `commands/` | 人的 `/命令`（req / prd / delivery / deliverables / company-settings / company-diagnostics；`/cultivation` 在 cultivation 组）、`present` 前的 PRD 闸门、`request_signoff` 工具与命令面共享的阻塞/文案 | req-command, prd-command, prd-gate, delivery-command, deliverables-command, deliverable-path, settings-command, signoff-tool, client-diagnostics, command-workspace, blocked-text, content-id |
| `prompt/` | 公司手册注入（T0）、workflow / delegation 能力域合同注入、公司工作语言 policy | handbook, contracts, delegation-contracts, language-policy |
| `startup/` | 启动策略（`startup.json` 人改 + `startup-options.json` host 派生）、每轮可见的 prompt section、变更 watcher | startup-store, startup-prompt, startup-watch, startup-workspace |
| `language/` | Host 工作语言桥（`settings.describe()` 的 `locale.preference` → zh/en；默认 zh、live update） | company-language |
| `logging/` | 有界追加日志（client-errors / upgrade log 共用） | rotating-log |
| `fs/` | 可写目录里「可读普通文件」的判据（存在 + 普通文件 + 非 symlink + realpath 在 root 内） | safe-file |

**入口**：`src/index.ts` 组合以上组，公开面只导出 loader 需要的 `apply` / `inject`。
**分层**：host → lib 单向；client 不得 import host（`src-layering` 门禁）。
**命名**：目录回答「属于哪组」，文件回答「做什么」；不要再回到 `host/*.ts` 平铺。
**镜像**：`tests/host/<组>/` 与本目录同名对应，未对应的两侧目录在 [mirror.spec](../../../../tests/repo/structure/mirror.spec.ts) 的例外表里带理由登记。
