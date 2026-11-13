# 数据模型：每份事实一个权威

> 性质：数据卡的当前时。什么时候读 = 改落点/身份/账本/备份策略时。
> 公司状态布局 = `.dsh-company/`（[run-bundle-paths](../../packages/company-pack/src/lib/run-bundle-paths.ts)）；
> 时序 = [runtime-map](../runtime-map.md)；发布/安装 = [release](./release.md)、[_dist 手册](../../_dist/安装手册.md)。

**用户拥有的业务字节留在 workspace；host 治理留 home；插件只拥有身份/方法/账本/索引。**
一个事实只有一个权威。workspace 是模型可写区（`workspace-write`）；方法层（D25）与 presented 账本
（M2）刻意留 home，不搬进模型可写区；workspace 的 `exports/` 只是派生快照。
字段全集（owner/authority/source/mechanism-path/scope-key/readers/writers/rebuildability/retention）= FAQ 26 91 数据卡；本表只列本仓有差异的列（当前 = 写者）。读者/写者由 RFC/Note 的 `## 状态事实与载体` 承载，不在这张表里重复。

| 事实 | Owner | Authority | 写者 | 位置 | 保留/迁移 |
|---|---|---|---|---|---|
| 插件定义（presets/persona/skills/host/client） | 维护者 | pack 文件 | 维护者发布 | `packages/company-pack/{presets,src}/**` | 随包版本；用户不改 |
| 只读内容（手册/模板/默认章程/状态默认值） | 维护者 | pack `content/` | 维护者发布；host 读 | `packages/company-pack/content/**` | 随包版本；**不复制到 workspace** |
| 公司状态（company/org/owners/台账/章程/journal） | 用户/公司 | workspace 文件 | host 首启只补缺；模型/人改 | `<workspace>/.dsh-company/kb/**` | 跟 workspace；不覆盖 |
| 交付物 | 用户/CEO | workspace 文件 | 角色 fs；CEO `present` | `<workspace>/.dsh-company/deliverables/**`、`deliverables-archive/**` | 跟 workspace；用户备份 |
| 培养记录 | 公司/角色 | 记录文件 | 模型 `cultivation_propose`（只建）；人命令改 | `<workspace>/.dsh-company/cultivation/records/**` | 跟 workspace；archive/purge 人工 |
| 成品索引 | 公司/盘上 meta/final | 派生 | host catalog | `<workspace>/.dsh-company/kb/deliverables-index.json` | 可删可重建 |
| 会话检索索引 | 会话历史全文 | 派生 K | `session-query-sqlite`（`company-session-search` 隔离组） | `<DSH_HOME>/cache/company/session-search-<profile>.db` | 可删可重建；单进程 owner、不跨 profile |
| 公司状态清单（身份） | 插件/这次安装 | manifest（host-owned 约定） | host apply；人只读 | `<workspace>/.dsh-company/bundle.json`（v3，legacy 文件名） | 只创建/原地升 v3；home 备份 |
| 方法层 | 部署者/角色 | **home 记录**（D25） | 人 `/cultivation adopt`；preset skill loader | `<DSH_HOME>/company/methods/<role>/**` | 跟 home；workspace `exports/methods/` 是派生 |
| presented 账本 | 操作员/本次交付 | **home domain/文件**（M2） | host 事件 + 人命令；模型不可写 | `<DSH_HOME>/storages/company_run_bundle_ledger.json` 或 `company/ledger/<hash>.json`（按 workspace key） | 跟 home；workspace `exports/ledger.json` 是派生 |
| 治理导出 | 插件 | 无（derived） | host | `<workspace>/.dsh-company/exports/**` | 可重建；不是第二权威 |
| writer lease | 进程/这个 home | 进程 | host | `<DSH_HOME>/company-pack.lock` | 进程持有；stale 接管 |
| 便利设置（最近 workspace） | 插件/这个 home | 便利设置文件 | host | `<DSH_HOME>/company/settings.json` | home 级便利；不是权威 |
| DSH workspace 登记 | DSH/这台机器 | DSH | 宿主/服务 | `<DSH_HOME>/storages/workspace.json` | DSH 所有；搬 home 需重加 |
| Session/present 事件 | DSH | session log | 模型/client | `<DSH_HOME>/sessions/` | 无删除 API；不删 |
| 凭据 | 用户/home | provider | 用户 | `<DSH_HOME>/.credentials.yaml` / env | 永不进 workspace/备份共享 |
| 浏览器状态 | 设备/origin | client | 浏览器 | localStorage | 换 origin 即丢；不参与模型 |

**版本**：`bundle.json` v3；catalog 1；presented 账本 schema 1（domain `company_run_bundle_ledger` v1，按 workspace key）；records 1；lease 1。
旧 `company_deliverables` domain / workspace `kb/deliverables-presented.json` / 根目录骨架不读不迁；旧文件保留。

**边界**：workspace 写入受 `workspace-write` 约束；`danger-full-access` 下无围栏。方法层/账本在
workspace 外（workspace-write 硬；danger 下仍是约定）。`bundle.json` 在 workspace 内，模型可写，
host 只校验 + 留 home 备份，**不是防篡改边界**。成品索引/导出是派生，只当显示/携带缓存。
方法层与账本按 home 保留；换 workspace 不重置 home 治理（一个安装一个公司）。
