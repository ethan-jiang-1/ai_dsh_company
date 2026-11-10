---
status: 已结
opened: 2026-11-11
---

# 推敲：两轴交付模式——`project-services` + `managed-service`

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 语义审（两轴/模式边界 + 测试矩阵）+ verify/test/typecheck/preset-smoke/two-axis-gates-smoke 实跑，证据见 Note
>
> **结论/去向**：note — [交付模式轴 Note](../../../notes/implemented/2026-11-11-delivery-mode-axis.md)。
>
> 上游研究：[两产品结构审计](../research/two-product-structure-audit/README.md)（D-02 / E14）；
> 用户 2026-11-11 指令：project-services 很常见，应做成 content 一等能力；managed-service 补第二个模式；
> 测试资产要能约束；公司能力不要硬编码进 preset。

**问题与期望结果：** `project-services` 原来只是 `product-definition` 的一个 reference，不是 content 包，
`business-software + project-services` 无法在 meta/checker/方法里表达；产品类型只驱动需求链，
CFO/COO/VP-Sales 在“项目制 / 产品制 / 持续服务”之间没有第二轴。期望：把交付模式做成 content 下的
一等能力，至少两个模式（project-services / managed-service），有 meta 字段、经营方法、workflow 分派、
awareness、门禁与测试；同时不把 SOW/UAT/SLA 细节写进 preset。

**当前情况：** 两轴 v1 已落地（详见 Note 与证据账本）：

- `content/delivery-modes/{project-services,managed-service}/`：overview / document-map / delivery-rules /
  templates / glossary；`productized` 是默认，不建包。
- `meta.md` 增 `交付模式:`；`/req check` 解析并点名模式，未知模式报错；缺 SOW/UAT/SLA/Runbook 给 warning；
  `business-software` 声明 `SyRS` 等类型不支持层时报错。
- CFO/COO/VP-Sales 各两个方法（project / managed），方法契约用 `适用交付模式`；
  三个 workflow 读 meta 的 `产品类型 + 交付模式` 分派，缺方法 fail-closed。
- awareness 七触点：AGENTS / meta / CEO step / product-definition / 经营 persona / `/req check` 回执 /
  交付模式包 overview。
- 测试资产：类型与模式各自有包形状、coverage、scenario、awareness；两个 sources 门禁的负例合并进
  [two-axis-gates-smoke](../../../checks/smoke/two-axis-gates-smoke.mjs)。

**未决问题：** 无阻塞；v1 明确不做逐动议 `/delivery check`（只 warning）；`productized` 的产品经济/定价方法
仍缺，遇到 `productized` 报价时 fail-closed，另开方法。D-01（硬软能力前置检查）仍是设计决策。

## 范围与排除项

- **在范围内**：交付模式包、meta 字段、方法契约、workflow 分派、awareness、sources 门禁、两轴测试资产。
- **排除**：把 project-services 做成第三个产品类型；把 SaaS/私有化/永久授权塞进 delivery-modes；
  逐动议 `/delivery check`；产品经济/定价全套方法；D-01 组织能力前置检查。

## 方案与取舍

| 选项 | 做法 | 结果 |
|---|---|---|
| **A 两轴（采用）** | 产品类型 × 交付模式；content/delivery-modes；meta 第二字段 | 能表达 business-software + project-services；方法按模式适用 |
| B 第三产品类型 | 把 project-services 塞进 product-types | 组合仍二选一；与 hardware-software 的 SI 语义继续打架 |
| C 全塞 preset | 在角色 skill 里写 SOW/SLA | 违反“能力住 content、preset 只留壳”；换模板要改 preset |
| D SaaS/on-prem 也做成模式 | 交付模式变杂物抽屉 | 部署/商业形态与交付方式混轴；已拒绝 |

## 抽象度

- 换公司要改吗？→ **不会**。模式包与模板随 pack 走；公司只填 `meta.md` 的 `交付模式`、rates/roster 等事实。
- 换产品类型要改吗？→ **不会**。需求链由产品类型决定；模式包只追加交付文档，不碰层/编号。
- 换做法要改吗？→ **会**。加一个新交付模式 = 包 + awareness + 三角色方法 + workflow + 回执 + 四个测试 + sources 门禁。
- 只有机制本身变才改吗？→ 模式内容（SOW/SLA 模板）住 content；preset 只留“读 meta → 加载哪个方法”的指针。
- 第二消费者：CMO/VP-Eng 读 `产品类型 × 交付模式` 选文档链；CFO/COO/VP-Sales 读模式加载经营方法；
  操作员用 `/req check` 回执和 sources 门禁复核。
- 搬家成本：模式包是 content 层，换部署/换模板成本低；若未来加第三轴（部署形态），应新增轴而不是塞进 delivery-modes。

## 关闭条件 / 验证

- `pnpm verify` ALL PASS；`pnpm test` **180 files / 1514 tests passed**；`pnpm typecheck` 0；
  `preset-smoke` ALL PASS；`two-axis-gates-smoke` ALL PASS。
- 场景：`product-type-scenarios` 7、`delivery-mode-scenarios` 15、coverage 8+8、package 7 全绿。
- 证据：[证据账本](../research/two-product-structure-audit/2026-11-11-evidence-ledger.md)；
  raw 输出在同目录 `experiments/raw/e27–e32`。
