# 数据模型：事实、权威、写通道与生命周期

> 性质：合同（只写 now）。什么时候读 = 部署/备份/迁移、改数据形状，或回答“谁写、谁看得见、升级留什么”。
> 用户侧摘要 = [pack README Data](../packages/company-pack/README.md#data)；外部依据 = FAQ 24/26（[登记](./external-research.md)）；Gap 账 = [Gap 卡](../_backlog/_archive/settled_issues/2026-10-27-data-model-gaps.md)。
> 已交付 = [数据设计硬化 Note](../notes/implemented/2026-10-28-data-design-hardening.md)。

## 一、一句话

**用户拥有的字节留在公司盘；插件只拥有身份、索引、游标、方法和审计账本；一个事实只有一个权威。**
自造目录/文件可以，但版本、迁移、备份、删除由本包承担——DSH 不提供“插件数据根”；硬边界只有包目录只读、
workspace 沙箱、session event 校验、storage domain schema 与 approval。备份/恢复/卸载 = [README Backup](../packages/company-pack/README.md#backup)。

## 二、事实级数据卡

| 事实 | 拥有·关于 | 权威 | 写者·通道 | 位置·键 | 可见性 | 寿命·删除 | 版本·测试 |
|---|---|---|---|---|---|---|---|
| 出厂基部（手册/章程/模板/org） | 用户 / 这个公司 | 用户；manifest 记哈希 | host 自举/升级；人可改 | `<DSH_HOME>/company-workspace/**` 或 `DSH_COMPANY_HOME`；相对路径 | 模型 fs / 用户 | 跟盘；未改替换、改过保留；卸载不删 | manifest v1；bootstrap/lifecycle |
| 扩张内容（journal/KB/台账/交付物） | 用户 / 这个公司 | 用户 / 角色 | 模型 fs + 人 | 同上；`kb/`、`deliverables/` | 模型 fs / 用户 / 客户端 | 跟盘；无自动 GC | 无（内容）；文件测试 |
| 培养记录 | 公司 / 角色 | 记录文件 | 模型 `cultivation_propose`（只建）；人命令改 | `<company>/cultivation/records/*.md`；文件名 id | 模型 fs / 客户端 / 用户 | 跟盘；archive/purge 人工 | `schema: 1`；cultivation spec |
| 方法层 | 部署者 / 角色 | 记录（方法文件是部署产物） | **仅人** `/cultivation adopt` | `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`（旧 profile 路径只读留一版） | 模型经 skill / 用户 | 跟 home；卸载保留 | skill loader；method-migration spec |
| 成品索引 | 公司 / 盘上 meta/final | 派生 | host catalog | `<company>/kb/deliverables-index.json` | 模型 fs / 客户端 | 可删可重建；显示缓存 | schema 1；catalog spec |
| `presented` 账本 | 操作员 / 这次交付 | domain `company_deliverables`（true 来自事件，false 人审） | host 事件 + 人命令；模型不能写 domain | `<DSH_HOME>/storages/company_deliverables.json`；旧 W `kb/deliverables-presented.json` 只读留一版 | 用户 / 索引派生 | 跟 home；删了丢 false/true 背书 | domain v1 + schema 1；tamper/backfill |
| writer lease | 进程 / 这个 home | 进程 | host apply | `<DSH_HOME>/company-pack.lock` | 宿主 | 进程持有；stale 接管 | schema 1；lease spec |
| `bundle.json` + 备份 | 插件 / 这个安装 | manifest | host apply；人只读 | `<DSH_HOME>/bundle.json(.bak-*)` | 用户 / 工具 | 只创建；升级改写；备份 5 份 | v1；manifest spec |
| 宿主日志（upgrade/client-errors） | 插件 / 这个 home | 插件 | host append/命令 | `<DSH_HOME>/logs/...` | 用户 / 模型 fs | 追加；client-errors 256 KiB 轮转；卸载不删 | 无版本；host-composition |
| 会话全文索引 | 无 / 会话语料 | 无（派生） | `session-query-sqlite` | `<DSH_HOME>/profiles/<p>/session-search.db` | 代码，非模型 | 可重建；卸载不删 | DSH schema；rebuild |
| DSH workspace 登记 | DSH / 这台机器 | DSH | 宿主/服务 | `<DSH_HOME>/storages/workspace.json` | 宿主 | 宿主所有；搬 home 需重加 | DSH 管；stale 告警 |
| 会话日志 + `present` 事件 | 会话 / 这次对话 | 日志 | agent loop / `present` | `<DSH_HOME>/sessions/` | 模型 / 客户端 | 无删除 API；不删 | DSH 格式；replay |
| 浏览器状态 | 设备 / origin | 客户端 | client apply | `localStorage`：`dsh-company-pack/.../v1` | 浏览器 | 换 origin 即丢；不参与模型 | v1；float/instance spec |
| 凭据 | 用户 / home | provider | 用户 | `<DSH_HOME>/.credentials.yaml` / env | 不进日志/导出 | 用户撤销；`0600` | DSH 管；secret scan |

## 三、写矩阵与硬软边界

| 通道 | 可以写 | 不该写 |
|---|---|---|
| 模型工具 | 内容：records/journal/drafts/final、`present` 声明 | 审计账本、方法层、`bundle.json`、lease |
| 人命令 | adopt/revoke/audit/archive/diagnostics | 内容正文（可走 fs，但应是人改） |
| host apply | 骨架 seed/upgrade、catalog、从事件记 ledger | 用户正文（除 seed/upgrade） |

| 边界 | 现在靠什么 | 硬吗 | 处置 |
|---|---|---|---|
| 公司盘写入 | fs-sandbox / bash 沙箱 | `workspace-write` 硬；`danger-full-access` 无 | 文案限定模式 |
| 审计账本 | domain（宿主 KV） | 硬（模型无工具写）；`danger-full-access` 下文件可改但 domain 版本仍校验 | 已迁；旧 W 只读留一版 |
| 成品索引 | W 文件 | 软且派生 | 只当显示缓存 |
| 方法层 | 公司级 home 目录（workspace 外） | 硬（`workspace-write`；`danger-full-access` 下降级为约定） | 已迁（M3） |
| 角色私有 | `kb/<role>` 约定 / writeScopes advisory | 软 | 写清不是隔离 |
| 签字线 | prompt + `request_signoff` | 只有工具被调用时硬 | 改文案，不改机制 |

## 四、作用域与键

- **公司盘根是唯一业务写作用域**：records/catalog/method 命令只认 `bundle.json` 解析出的 company root；会话 cwd 在盘子目录/盘外时拒绝公司数据写入。
- **落点安全与换盘**：`DSH_COMPANY_HOME` 等于/包含 `DSH_HOME` 或 OS home、或指向普通文件时停写并告警；换盘默认硬阻断，`DSH_COMPANY_REBIND=1` + 旧盘已不存在 + 新盘形状正确时才备份 manifest → 改写 workspace → 记日志；不迁 session `header.cwd`。
- **方法层是公司级**：`<DSH_HOME>/company/methods/<role>/`；同 home 多 profile 共享；旧 `<profile>/company-cultivation/` 只读留一版，host 启动一次性迁移（冲突落 `.legacy/`）。
- **键**：`bundle.json.workspace` 在 home 内记相对路径、在外记绝对路径；不用 `workspaceId` 当长期键；DSH 的 workspace 登记是另一本账，搬 home 后需人重加。

## 五、版本与标识符

| 版本 | 归属 | 变更规则 |
|---|---|---|
| 包/组合 | npm + bundle patch | 改内容必 bump；发布字节 = 冒烟字节；行 id / Config 键 / 默认值破坏性变更写迁移 |
| 定义/资源 | preset + skill/locale/icon | 已有 Agent 保留旧 revision；资源随包替换，用户可编辑的不放包内 |
| 数据 schema | 本包 | `bundle.json` v1 / catalog 1 / ledger 1 / records 1 / lease 1 / domain `company_deliverables` v1；版本不符 fail loud |
| 会话格式 | DSH | 作者不改；按 `SESSION_FORMAT_VERSION` 规则演进 |

**标识符是 API**：行 id、preset id、Config 字段、skill 名、domain 名 + schema、文件路径、localStorage 键；改名/改 schema 必须先想迁移。
**不自造 session 扩展**：不新增 `SessionEventMap` 类型、不依赖 `plugin:` 记录；用已有事件、投影、`agent.inject()` 或 storage。

## 六、边界与威胁模型

- Host 插件在进程内、沙箱之外执行；包目录只读；沙箱只管“改”，读不受限。
- H 是**写边界**，不是保密边界：模型可读 home 文件，但不应能经工具写 H；`danger-full-access` 下无文件围栏，H/方法层的隔离承诺都降级为约定。
- 角色边界、owners、签字线是 prompt/approval 级，不是数据 ACL；**不做 per-role 数据隔离**。
- 公司内容会作为工具结果/指令进入模型请求；本包不向第三方上传；client-errors/日志可能含 URL，按普通文件处理。
- 单 Host、单 `DSH_HOME`；多租户/跨机器同步、session 删除 API、多 Host 事务不在范围；不引入 E1 依赖，不新增 event 类型。
