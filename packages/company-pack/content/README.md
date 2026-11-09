# 插件内容（只读）

这个目录是 `dsh-company-pack` 的**只读产品内容**，安装后随包版本更新，不是用户的 run bundle：

- `AGENTS.md`：公司手册。host 在 agent 创建时注入 system prompt section；**不复制到 workspace**。
- `templates/`：角色写作模板。角色默认读这里；用户要改，复制到
  `<workspace>/.dsh-company/overrides/templates/`。**这是提示级覆盖**：会话被指示优先读 override
  （host 注入前言里统一声明），不是文件系统强制。
- `charters/<role>.md`：默认角色章程。首启时只补缺地生成
  `<workspace>/.dsh-company/kb/<role>/CHARTER.md`；用户改的是 run bundle 里的实例。
- `state/`：公司/org/owners/台账的默认状态实例；首启只补缺。

run bundle 在用户 workspace 的 `.dsh-company/`，由 host 初始化；插件代码（`src/host`、`src/client`）
与 preset/persona/skills 在包的其他目录。**不要在这个目录写运行时数据。**
