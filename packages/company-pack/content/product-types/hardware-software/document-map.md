# 需求文档链与校验（hardware-software）

> 层：产品类型 · 加载：按需（T2）。本文件是"哪些文档、什么编号、跑哪个校验"的唯一家。

- **产品定义的文件名固定，编号只承载身份**：CMO 写 `drafts/mrd.md`（`MR-###`）+ `drafts/strs.md`（`REQ-###`），VP-Eng 写 `drafts/prd.md`（`REQ-###` / `AC-###-#`）；系统/接口/验证文档不再有专职 preset，若 CEO 指派 owner，owner 写在文档头，模板仍可用；**编号规则、退役词、追溯与范围豁免的唯一合同 = pack `content/state/process-docs.md`**。结构校验 = `/prd check <deliverables 目录名>`（含 no-go/defer 边界）；编号/追溯 = `/req check <deliverables 目录名>`（操作员跑，角色不自证）。
