# workspace/ —— 出厂公司盘骨架（随 pack 分发）

公司角色会话说到底只是"读工作目录里的人写的东西"：手册（`AGENTS.md`，由 `agent-instructions`
从会话 cwd 注入）、岗位章程（`kb/<角色>/CHARTER.md`）、编制与授权面（`kb/org.md` / `kb/owners.md`）、
动议台账（`kb/motion-ledger.md`）、写作模板（`templates/`）、交付物与归档空目录。

**为什么在这里**：这些是**产品的一部分**（第三方装同一个插件，该拿到同一份手册与章程），
而本仓 `company-workspace/` 是**我们这一家的运行盘**——制度件在本目录（唯一真源），
运行盘用**符号链接**指回来；本部署自己的数据（owners 填写、台账行、journal、交付物）留在运行盘。

**装完怎么落盘**（安装步骤，详见 `docs/guides/release.md`）：

```sh
# 你的公司盘（会话 cwd）——目录骨架 + 制度件 + 起动件
mkdir -p <你的公司盘> && cp -R <安装的包>/workspace/. <你的公司盘>/
# 然后填 <你的公司盘>/kb/owners.md（谁答什么），把公司盘连到会话里即可
```

⚠ 起动件 vs 制度件：`kb/owners.md` 与 `kb/motion-ledger.md` 是**待填/待写**的部署件（复制后归你），
其余（手册/章程/org/模板）用同一份即可——本仓运行盘对它们用符号链接保持单源。
