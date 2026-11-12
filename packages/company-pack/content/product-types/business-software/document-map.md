# 需求文档链与校验（business-software）

> 层：产品类型 · 加载：按需（T2）。本文件是“哪些文档、什么编号、跑哪个校验”的唯一家。

- **产品定义的文件名固定，编号只承载身份**：CMO 写 `drafts/mrd.md`（`MR-###`）+ `drafts/strs.md`
  （`REQ-###`），VP-Eng 写 `drafts/prd.md`（`REQ-###` / `AC-###-#`）。
- **链到 PRD 为止**：没有 SyRS / IRS / V&V 层；系统/接口/部署作为 PRD 的技术约束与风险写。
  若动议确实需要系统级需求或独立验证计划，改用 `hardware-software` 类型。
- **编号规则、退役词、追溯与范围豁免的唯一合同** = pack `content/product-types/business-software/requirements-model.md`。
- **结构校验** = `/prd check <deliverables 目录名>`（MRD/PRD 结构、AC、changeLog）；
  **编号/追溯** = `/req check <deliverables 目录名>`（操作员跑，角色不自证）。
- `check-rules.json` 的层 = `MRD / StRS / PRD`，默认层 = 同三层；`layers:` 不需要再声明系统层。
