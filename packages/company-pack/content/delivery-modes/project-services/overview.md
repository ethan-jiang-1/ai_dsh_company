# 项目制 / 系统集成 · 交付模式

> 层：交付模式 · 加载：按需（T2）。这是**交付模式**，不是产品类型；产品类型回答“造什么”，
> 交付模式回答“怎么交付”。动议可以组合：`business-software × project-services`。

## 什么时候用

- 交付发生在客户现场，或按 SOW / 里程碑 / UAT 验收；
- 需要驻场、实施、培训、切换、第三方系统对接；
- 合同按里程碑收款，交付物包含实施与验收，而不只是软件许可/订阅。

**不要用**：纯产品售卖、SaaS 订阅、无 SOW/UAT/驻场的标准产品交付——那用 `deliveryMode: productized`。

## 两轴组合

| 产品类型 | 交付模式 | 需求链 | 追加交付物 |
|---|---|---|---|
| business-software | productized | MRD → StRS → PRD | 无 SOW/UAT |
| business-software | project-services | MRD → StRS → PRD | SOW / UAT / RACI / 里程碑 |
| hardware-software | productized | MRD → StRS → PRD（可选 SyRS/IRS/V&V） | 无 SOW/UAT |
| hardware-software | project-services | 同上 | SOW / UAT / RACI / 里程碑 |

**需求链由产品类型决定；project-services 只追加交付文档与验收口径，不改需求层。**
`project-services` 不是第三个产品类型，不要写进 `产品类型` 字段。

## 动议户口

```yaml
productType: business-software
deliveryMode: project-services
```

不写 `交付模式` = `productized`。有 SOW / UAT / 驻场 / 里程碑验收，就写 `project-services`。

## 谁负责什么

| 交付物 | owner | 说明 |
|---|---|---|
| SOW / 范围边界 | COO | 与 VP-Eng 的 PRD 对齐；不替代 PRD |
| UAT 计划与验收 | COO | 用例覆盖 PRD 的 REQ/AC；客户签字 |
| RACI / 里程碑 | COO | 人力与排期以 `kb/roster.md` 为准 |
| 项目经济性 | CFO | 3-4-3、维护年费、垫资；见 `content/company/policy-lines.md` |
| 定价建议 | VP-Sales | 项目制定价；见 `pricing` skill |
| 技术范围 | VP-Eng | 接口、依赖、可行性 |

## 边界

- 交付模式不改变产品类型的编号合同与需求层；SOW/UAT 是交付文档，不是需求层。
- 没有 SOW/UAT/驻场就不要写 project-services；写了就要有对应文档，否则 COO/CFO 应报缺。
- 项目制方法（`project-economics` / `ops-feasibility` / `pricing`）只适用于本交付模式；
  `productized` 动议不要套 3-4-3 / SOW / 维护年费。

## 相关

- 文档映射 = [document-map.md](document-map.md)
- 机器可读规则 = [delivery-rules.json](delivery-rules.json)
- 模板 = [templates/](templates/)
- 术语 = [glossary.md](glossary.md)
