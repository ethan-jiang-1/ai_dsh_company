# 数据模型：事实、权威、作用域与生命周期

> 性质：合同（只写 now）。什么时候读 = 发布后部署、备份/迁移、改 `bundle.json`/成品索引/培养记录的形状，或回答“这份数据谁删、备份什么、升级留什么”。用户侧摘要 = [pack README Data](../packages/company-pack/README.md#data)；外部依据 = FAQ 26（[登记](./external-research.md)）；P1/P2 未收口项 = [数据模型 Gap 卡](../_backlog/issues/2026-10-27-data-model-gaps.md)。

## 一、一句话

**用户拥有的字节留在公司盘；插件只拥有身份、索引、游标、方法和审计账本；一个事实只有一个权威。** 自造目录/文件可以，但版本、迁移、备份、删除由本包承担——DSH 不提供“插件数据根”。

## 二、事实级数据卡

| 事实 | 承诺 | 权威 | 作用域 / 键 | 位置 | 寿命 / 删除 | 可重建 | 敏感 |
|---|---|---|---|---|---|---|---|
| 出厂基部（手册/章程/模板/org） | P2 内容 | 用户；`bundle.json` 记基部哈希 | company workspace | `<DSH_HOME>/company-workspace` 或 `DSH_COMPANY_HOME` | 跟盘；升级未改替换、改过保留；卸载不删 | 可从 pack 重新补缺，但“改过/没改过”的判定依赖 manifest | 否 |
| 扩张内容（journal/KB/台账/交付物） | P2 内容 | 用户 / 角色 | company workspace | 同上 | 跟盘；用户/操作员保留；无自动 GC | 否（用户内容） | 可能含公司机密 |
| 培养记录 | P2 内容 | 记录文件 | **company root**（不是 session cwd） | `<company>/cultivation/records/*.md` | 跟盘；无自动 GC；归档靠操作员 | 否（人/分身写的决定） | 背景摘录可能含会话内容 |
| 方法层 | P3 状态 / P4 配置 | 插件 | **profile** | `<DSH_HOME>/profiles/<p>/company-cultivation/<role>/<slug>/SKILL.md` | 跟 profile；卸载保留；换 profile 不共享 | 不能自动重建；记录保留正文，方法丢失需人工按记录恢复 | 方法论，可能引用公司事实 |
| 成品索引 | P1 派生 | 盘上 meta/final + 账本 | company workspace | `<company>/kb/deliverables-index.json` | 可删/可重建；不承载审计权威 | 是 | 路径/结论 |
| `presented` 审计账本 | P3 状态 | 操作员审计 + 会话事件 | company workspace | `<company>/kb/deliverables-presented.json` | 跟盘；删了丢 `false` 审计与历史 `true` 背书 | 部分：`true` 可从会话事件回扫，`false` 不能 | 审计结论 |
| `bundle.json` | P4 身份 | 插件 | home / bundle | `<DSH_HOME>/bundle.json` | 只创建；升级改写；删了丢基部哈希与换盘历史 | 否（重建=丢升级判定） | 含绝对路径 |
| 换盘备份 | P3 审计 | 插件 | home | `<DSH_HOME>/bundle.json.bak-*` | 每次显式 rebind 一份；不自动清 | 否（备份） | 含绝对路径 |
| 升级日志 | P3 审计 | 插件 | home | `<DSH_HOME>/logs/company-pack-upgrade.log` | 追加；无轮转 | 否 | 含绝对路径/文件名 |
| 会话全文索引 | P1 派生 | 无 | profile | `<DSH_HOME>/profiles/<p>/session-search.db` | 可重建；卸载不删 | 是 | 可能含会话正文 |
| DSH workspace 登记 | 宿主状态 | DSH | home | `<DSH_HOME>/storages/workspace.json` | 宿主所有；搬 home 后不会自动重写 | 否（重加工作区） | 绝对路径 |
| 会话日志 + `present` 事件 | 历史 | 会话 | session | `<DSH_HOME>/sessions/` | 核心无删除 API | 导出 ZIP；不删 | 可能含秘密/正文 |
| 浏览器状态 | 客户端 | 设备 | origin | `localStorage`（浮窗几何、实例心跳） | 换端口/浏览器即丢；不参与模型请求 | 否（UI 偏好） | 否 |
| 凭据 | 凭据 | provider | home | `<DSH_HOME>/.credentials.yaml` / 环境变量 | 用户管理；`0600` | 否 | 是 |

## 三、作用域与键

- **公司盘根是唯一写作用域**：培养记录、成品目录、方法层命令都只认 `bundle.json` 解析出的 company root。session `header.cwd` 在盘子目录或盘外时，host 明确拒绝公司数据写入（不是只告警）；页签/身份显示「非公司盘」。
- **不用 `workspaceId` 当长期键**：`bundle.json.workspace` 在 home 内记相对路径、在外记绝对路径；这是 pack 的稳定身份。DSH 自己的 workspace 登记是另一本账，搬 home 后需要人重新添加。
- **换盘**：默认硬阻断；`DSH_COMPANY_REBIND=1` + 旧盘已不存在 + 新盘形状正确时，备份 `bundle.json` → 改写 workspace → 记日志。**不迁 DSH session 的 `header.cwd`**——旧会话仍锚在旧绝对路径；要连历史一起搬，只能保持原绝对路径或接受旧会话不可续。
- **方法层是 profile 级**：一个公司 = 一个 web profile。同 home 多 profile 共享 `bundle.json`/公司盘/sessions，但方法层各一份；这是刻意边界，不是隔离承诺。

## 四、版本与迁移

| 数据 | 版本字段 | 未知/更高版本 | 迁移责任 |
|---|---|---|---|
| `bundle.json` | `v: 1` | 保留原文件 + 告警，跳过身份/升级；不覆盖 | 未来 v2 由新 pack 提供迁移；旧 pack 不猜 |
| 成品索引 | `schema: 1` | 保留原文件 + 告警，按盘上内容重建派生视图 | 派生，可重建 |
| `presented` 账本 | `schema: 1` | 保留原文件 + 告警，presented 暂按未核；不覆盖 | 旧 false 从旧索引迁移；true 可从会话事件回扫 |
| 培养记录 | 无 | 坏形状跳过并计数；不静默改写 | 格式变更走兼容读 + 新可选字段；破坏性变更新文件名/一次性迁移 |
| 方法层 `SKILL.md` | skill loader 认 `name`/`description` | 额外字段忽略；不认识的形状不加载 | 新字段附加；不覆盖用户方法 |

**fail loud 优先于静默重建**：权威数据（`bundle.json`/账本）损坏时保留原文件；只有派生索引可以重建。

## 五、备份、恢复与删除

| 备份 | 内容 | 丢什么 | 用途 |
|---|---|---|---|
| `business` | 公司盘（含 journal/交付物/records/两个 `kb/` 索引）+ `bundle.json` + `profiles/<p>/company-cultivation/` | sessions、`.credentials.yaml`、`session-search.db`、DSH workspace 登记 | 交接/换机器/公司数据归档 |
| `full` | 整个 `DSH_HOME` | 不丢（但含会话正文/密钥/绝对路径） | 整机迁移/灾难恢复；加密、限权、不共享 |

- 恢复 `business`：新 home 解包 → `plugin add` 同版本/新版本 → 启动；旧会话不会回来（没有 sessions）。
- 恢复 `full`：整 home 搬移；DSH 的 `storages/workspace.json`/session 目录名仍是绝对旧路径，需在侧栏重加工作区；旧会话仍锚旧 cwd。
- 卸载：`plugin remove` 只摘插件/profile 层；公司盘、`bundle.json`/`.bak-*`、方法层、sessions、`session-search.db` 保留。彻底删除 = 确认备份后删整个 `DSH_HOME`。
- 删除/保留：pack 不自动删用户内容、records、journal、交付物；journal 的“轮末收敛”是操作员在会话外做；records 归档/清理是操作员动作（无自动 GC）。

## 六、边界

- 单 Host、单 `DSH_HOME`；多租户/跨机器同步不在范围。
- 不物理删 session 日志、不改 session header；需要会话历史迁移时接受旧 cwd 限制。
- 不引入第三方 E1 依赖；不新增 `SessionEventMap` 类型；不把插件状态塞进会话 surface。
- 包目录只读；数据只写公司盘、home、profile 方法层或浏览器本地。
