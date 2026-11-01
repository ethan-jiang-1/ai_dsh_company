# 数据模型：事实、权威、写通道与生命周期（2026-11-01 产品化）

> 性质：合同（只写 now）。什么时候读 = 部署/备份/迁移、改数据形状，或回答“谁写、谁看得见、升级留什么”。
> 用户侧摘要 = [pack README Data](../packages/company-pack/README.md#data)；外部依据 = FAQ 24/26
> （[登记](./external-research.md)）；Gap 账 = [_backlog](../_backlog/README.md)。
## 一、一句话

**用户拥有的业务字节留在 workspace；host 治理留 home；插件只拥有身份/索引/游标/方法/审计。
一个事实只有一个权威。** workspace 是模型可写区（`workspace-write`）；方法层（D25）与 presented
账本（M2）刻意留 home，不搬进模型可写区；workspace 的 `exports/` 只是派生快照。
## 二、事实级数据卡

| 事实 | 拥有·关于 | 权威 | 写者·通道 | 位置·键 | 可见性 | 寿命·删除 | 版本·测试 |
|---|---|---|---|---|---|---|---|
| 出厂基部（手册/章程/模板/org） | 用户/公司 | 用户；manifest 记哈希 | host 自举/升级；人可改 | `<workspace>/**`；手册 `AGENTS.md` 或碰名 `COMPANY.md` | 模型 fs / 用户 | 跟盘；未改替换、改过保留；卸载不删 | manifest v2；bootstrap/lifecycle |
| 扩张内容（journal/KB/台账/交付物） | 用户/公司 | 用户/角色 | 模型 fs + 人 | 同上；`kb/`、`deliverables/`、`cultivation/` | 模型 fs / 用户 / 客户端 | 跟盘；无自动 GC | 无（内容）；文件测试 |
| 培养记录 | 公司/角色 | 记录文件 | 模型 `cultivation_propose`（只建）；人命令改 | `<workspace>/cultivation/records/*.md` | 模型 fs / 客户端 / 用户 | 跟盘；archive/purge 人工 | `schema:1`；cultivation spec |
| 方法层 | 部署者/角色 | 记录（方法文件是部署产物） | **仅人** `/cultivation adopt` | `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md` | 模型经 skill / 用户 | 跟 home；卸载保留 | skill loader；method-migration |
| 成品索引 | 公司/盘上 meta/final | 派生 | host catalog | `<workspace>/kb/deliverables-index.json` | 模型 fs / 客户端 | 可删可重建 | schema 1；catalog spec |
| `presented` 账本 | 操作员/本次交付 | domain `company_deliverables`（true 来自事件，false 人审） | host 事件 + 人命令；模型不能写 domain | `<DSH_HOME>/storages/company_deliverables.json` | 用户/索引派生 | 跟 home；删了丢 false/true 背书 | domain v1 + schema 1；tamper/backfill |
| 治理导出 | 插件 | 无（derived） | host | `<workspace>/.dsh-company/exports/{methods,ledger.json}` | 用户/备份 | 可删可重建；不是第二权威 | 导出 spec |
| `bundle.json` v2 + 备份 | 插件/这次安装 | manifest（host-owned 约定） | host apply；人只读 | `<workspace>/.dsh-company/bundle.json`；home `company/identity/<id>.json` | 用户/工具 | 只创建；升级改写；身份备份仅恢复 | v2；manifest spec |
| writer lease | 进程/这个 home | 进程 | host apply | `<DSH_HOME>/company-pack.lock` | 宿主 | 进程持有；stale 接管 | schema 1；lease |
| 宿主日志 | 插件/这个 home | 插件 | host append/命令 | `<DSH_HOME>/logs/...`（升级日志在 workspace `.dsh-company/logs/`） | 用户/模型 fs | 追加；轮转 `.1`；卸载不删 | 无版本；host-composition |
| 会话全文索引 | 无/会话语料 | 无（派生） | `session-query-sqlite` | `<DSH_HOME>/cache/company/session-search-<p>.db` | 代码，非模型 | 可重建 | DSH schema；rebuild |
| DSH workspace 登记 | DSH/这台机器 | DSH | 宿主/服务 | `<DSH_HOME>/storages/workspace.json` | 宿主 | 宿主所有；搬 home 需重加 | DSH 管；stale 告警 |
| 会话日志 + present 事件 | 会话/这次对话 | 日志 | agent loop / present | `<DSH_HOME>/sessions/` | 模型/客户端 | 无删除 API；不删 | DSH 格式；replay |
| 产品设置（当前 workspace） | 插件/这个 home | 产品设置文件 | 启动器 | `<DSH_HOME>/company/settings.json` | launcher/host | home 级便利；不是业务权威 | v1；launcher spec |
| 浏览器状态 | 设备/origin | 客户端 | client apply | `localStorage` | 浏览器 | 换 origin 即丢；不参与模型 | v1；float/instance |
| 凭据 | 用户/home | provider | 用户 | `<DSH_HOME>/.credentials.yaml` / env | 不进日志/导出 | 用户撤销；`0600` | DSH 管；secret scan |
## 三、写矩阵与硬软边界

| 通道 | 可以写 | 不该写 |
|---|---|---|
| 模型工具 | 内容：records/journal/drafts/final、`present` 声明、workspace 手改 | 方法层/账本 domain、`bundle.json`（可写但 host-owned）、lease |
| 人命令 | adopt/revoke/audit/archive/diagnostics | 内容正文（可走 fs，但应是人改） |
| host apply | 骨架 seed/升级、catalog、从事件记 ledger、治理导出 | 用户正文（除 seed/upgrade） |

| 边界 | 现在靠什么 | 硬吗 | 处置 |
|---|---|---|---|
| workspace 写入 | fs-sandbox / bash 沙箱 | `workspace-write` 硬；`danger-full-access` 无 | 文案限定模式 |
| 方法层/账本 | home（workspace 外） | `workspace-write` 硬；`danger-full-access` 降级约定 | 保持；不要搬 |
| `bundle.json` | workspace + home 备份 | 软（模型可写） | host 校验 + fail loud；不是防篡改 |
| 成品索引/导出 | workspace 文件 | 软且派生 | 只当显示/携带缓存 |
| 角色私有 | `kb/<role>` 约定 / writeScopes advisory | 软 | 写清不是隔离 |
| 签字线 | prompt + `request_signoff` | 只有工具被调用时硬 | 改文案，不改机制 |
## 四、作用域与键

- **公司盘根 = 唯一业务写作用域**：records/catalog/method 命令只认 `DSH_COMPANY_HOME` 解析出的
  workspace root；会话 cwd 在子目录/盘外时拒绝公司数据写入。
- **落点安全**：`DSH_COMPANY_HOME` 等于/包含 `DSH_HOME` 或 OS home、或指向普通文件时停写并告警；
  没有默认 `<DSH_HOME>/company-workspace`。换 workspace = 新 home（启动器拒绝同 home 第二盘）。
- **搬移**：`DSH_COMPANY_REBIND` 退役；搬 workspace 后重新登记，旧 session `header.cwd` 不可续。
- **键**：`bundle.json` v2 无 `workspace` 字段（自定位）；home `company/settings.json` 只存当前
  workspace 便利值；DSH workspace 登记是另一本账。
## 五、版本与标识符

| 版本 | 归属 | 变更规则 |
|---|---|---|
| 包/组合 | npm + bundle patch | 改内容必 bump；发布字节 = 冒烟字节；行 id/Config/默认值破坏性变更写迁移 |
| 数据 schema | 本包 | `bundle.json` v2 / catalog 1 / ledger 1 / records 1 / lease 1 / domain `company_deliverables` v1；版本不符 fail loud |
| 会话格式 | DSH | 作者不改；按 `SESSION_FORMAT_VERSION` 规则演进 |

**标识符是 API**：行 id、preset id、Config 字段、skill 名、domain 名 + schema、文件路径、
localStorage 键；改名/改 schema 必须先想迁移。**不自造 session 扩展**。

## 六、边界与威胁模型

- Host 插件在进程内、沙箱之外执行；包目录只读；沙箱只管“改”，读不受限。
- H 是**写边界**，不是保密边界；`danger-full-access` 下无文件围栏，H/方法层/账本的隔离承诺降级约定。
- 角色边界、owners、签字线是 prompt/approval 级，不是数据 ACL；**不做 per-role 数据隔离**。
- `AGENTS.md`/`COMPANY.md`/`owners.md`/CHARTER 是指令/治理面（W，可写）；模型改它会影响后续会话
  指令链，并被基部哈希视为“用户改过”；这是约定，不是 ACL。
- 公司内容会作为工具结果/指令进入模型请求；本包不向第三方上传；client-errors/日志可能含 URL。
- 单 Host、单 `DSH_HOME`；多租户/跨机器同步/session 删除 API/多 Host 事务不在范围；不引入 E1 依赖，
  不新增 event 类型。
