# 企业软件 · 产品类型概览

> 层：产品类型 · 加载：按需（T2）；本文件是 ≤2KB 摘要。用于**纯软 / 企业软件**：没有现场硬件、没有固件/电气/机械交付物，
> 也不按项目制 SOW 交付。产品类型 = 工程学科；SaaS / 私有化 / 永久授权是**部署/商业形态**，
> 不是产品类型，也不是第二轴的交付模式（交付模式 = `productized` / `project-services` / `managed-service`）。

## 什么时候用

- 交付物是软件服务、桌面/企业应用、平台或工具链；
- 没有需要现场安装、供电、采样、承力或认证的硬件件；
- 收入可以是订阅、席位、用量或永久授权；交付可以是 SaaS、私有化或本地部署。

若动议含现场硬件、固件、电气/机械件或认证，改用 `hardware-software`。
若按 SOW/UAT/驻场交付，**产品类型仍是 `business-software`**，把 `交付模式` 写成 `project-services`；
交付文档与模板见 `content/delivery-modes/project-services/`，不要在本类型里硬塞 SOW。
若卖的是持续 SLA / 值班 / 月报 / 续费，交付模式写 `managed-service`；文档见 `content/delivery-modes/managed-service/`。

## 文档链

`MRD → StRS → PRD`，到产品层为止：

| 层 | 回答什么 | owner | 文件 |
|---|---|---|---|
| MRD | 该不该做、为谁做、凭什么赢 | CMO | `drafts/mrd.md` |
| StRS | 谁在乎、在乎什么、验收时谁点头 | CMO | `drafts/strs.md` |
| PRD | 卖的是什么产品、怎么验收、怎么切片 | VP-Eng | `drafts/prd.md` |

**没有 SyRS / IRS / V&V 层**；接口、系统边界、部署形态作为 PRD 的技术约束/风险写，不另立需求层。
若动议确实需要系统级需求或独立验证计划，改用 `hardware-software`，不要在本类型里硬塞。

## 部署/商业形态（写在 PRD，不另立类型）

- **SaaS**：tenant、SLA、activation、retention、release train、feature flag；验收看使用数据与 SLO。
- **私有化 / 本地部署**：安装、升级、兼容矩阵、数据迁移、回滚；验收看现场升级与回滚演练。
- **永久授权**：版本兼容、维护窗口、许可证与升级路径；验收看版本支持矩阵。

部署/商业形态影响验收口径与发布方式，但不改变 MRD/StRS/PRD 的层与编号。

## 成功判据

- 每条 REQ 有可判真假的 AC；
- 发布有灰度/回滚或升级/回滚路径；
- 关键使用指标（激活、留存、SLO、工单）有基线或采集方式；
- 范围外与未决单列，不用“以后再说”代替。

## 与硬软一体 / 项目制的差异

- 没有 BOM、认证、试产、现场安装、固件/硬件兼容矩阵；
- 没有 SyRS/IRS/V&V 的强制层；接口与部署写在 PRD；
- 验收偏使用数据/发布/升级，不是现场验收单或 UAT 签字。

## 术语

见 `glossary.md`（tenant / SLA / activation / retention / release train / feature flag / on-prem / perpetual）。
