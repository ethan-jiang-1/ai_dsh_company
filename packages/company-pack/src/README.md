# src/ —— 自定义 host 代码的家（阶段 3+ 才会有第一行）

- `delegation/`：M2 one-shot providers（给委托 child 挂角色 preset，docs/design/20 §3-M2；
  实现时复用 subagent-in-process-driver 的组合路径，只把 composeFrom 换成 mount）。
- `tools/`：org_chart、公司知识检索等自定义工具。
