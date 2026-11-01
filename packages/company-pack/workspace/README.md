# 你的公司 workspace（run bundle）

这是产品启动时指定的用户 workspace，也是角色会话的工作目录（Session cwd）。它属于**这个公司**：
公司盘、`bundle.json`、升级日志、治理导出都在这里；插件包本身不在这里（插件定义只住
产品包（维护者仓库；安装后只读））。

> **一次安装 = 一个 DSH home + 一个 `company` profile + 一个 workspace**。换项目用新的 home，
> 不要把第二个公司盘塞进同一个 home。home 只留 DSH 运行时与 host 治理（sessions / 凭据 /
> workspace 登记 / 方法层 / 审计账本 / lease / 身份备份）。

## 什么随插件升级，什么是你的

| 件 | 谁维护 | 说明 |
|---|---|---|
| `AGENTS.md`（公司手册） | **基部**（pack 内 `workspace/` 是唯一真源） | 每个成员会话注入；若目标已有用户 `AGENTS.md`，公司手册落 `COMPANY.md`，不覆盖 |
| `kb/company.md`（公司身份） | **你的**（出厂样例，装后改） | 公司名 / 产品名；公司视图与手册引用这里 |
| `kb/org.md`、`kb/<角色>/CHARTER.md`、`templates/` | **基部起步** | 没改过的随 pack 替换，改过的保留并在升级日志点名；CHARTER 历史是你的扩张数据 |
| `kb/owners.md`、`kb/motion-ledger.md` | **你的** | 人侧授权面 / 动议台账 |
| `kb/<角色>/journal/` | **你的** | 当轮记忆；轮末由人收敛 |
| `deliverables/<日期>-<slug>/` | **你的** | 过程稿 / `final.md` / `meta.md`；`final` 必须来自 CEO 的 `present` |
| `deliverables-archive/` | **你的** | 已收敛交付物（只读历史） |
| `cultivation/records/` | **你的** | 培养记录；`/cultivation archive|purge` 管理 |
| `.dsh-company/bundle.json` | 插件（host-owned 约定） | v2 身份（id / createdAt / pack / handbookTarget / 基部 sha256）；模型可写，host 校验 + home 身份备份 |
| `.dsh-company/logs/` | 插件 | 升级日志 |
| `.dsh-company/exports/` | 插件（派生） | 方法层 / presented 账本的可读快照；**不是权威** |

**方法层 / 审计账本不在这个目录**：它们在 `<DSH_HOME>/company/methods/` 与
`<DSH_HOME>/storages/company_deliverables.json`，只由 host/人命令写；workspace 里的 `exports/`
只是可携带快照。这是刻意的安全边界（D25/M2），不要搬进来。

## 开工前

1. 填 `kb/owners.md`（谁答什么）。
2. 用产品启动器指定本目录（首次会确认 seed；已有盘只补缺，不覆盖）。
3. 开 CEO 会话，选 `ceo` preset；动议怎么走见 `AGENTS.md`/`COMPANY.md`。

## 升级与备份

- **身份**：`.dsh-company/bundle.json`（v2）；首启只创建、不覆盖；之后每次启动做基部升级判定。
- **基部升级**：目标缺失补建；你改过（哈希 ≠ 上次基部哈希）保留；没改过替换；扩张面不动。
- **备份**：`business` = 本 workspace + home 的 `company/methods/` 与
  `storages/company_deliverables.json`（或 `exports/`）；`full` = 整个 home + workspace。
  没有 sessions 时旧会话不会回来；搬 home/workspace 后 DSH 的绝对登记要重新添加。

> `DSH_COMPANY_HOME` = 本目录；`DSH_COMPANY_BOOTSTRAP=off` 只关“复制骨架/写身份”；
> `DSH_COMPANY_REBIND` 已退役（设了只告警）。方法层/账本留 home；不要用 workspace 副本当权威。
