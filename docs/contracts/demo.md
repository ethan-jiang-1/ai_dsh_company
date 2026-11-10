# demo · 动议操作合同

> 什么时候读：演示前核对判据、判断交付物三态时。开门/分镜/场景 = [guides/demo-scenes.md](../guides/demo-scenes.md)。
> 合同：demo 的动议、验收判据与已知边界；分镜、场景与观测点 = [guides/demo-scenes.md](../guides/demo-scenes.md)。

## 动议

> 把我们的对账 / 票据核对能力产品化，卖给现有 9 家客户——做不做、怎么定价、接不接得住

选它的理由：一条动议同时需要四个职能的判断（市场与定价 / 技术可行性 / 交付承接 / 毛利与合规），
且与公司已有的财务 agent 案（旧平铺形状的 `deliverables/finance-agent-workflow-vp-eng.md`——**该形状已废止、文件已不在**，2026-09-26 核实；此处只作历史对照）。

## 场景与开门

> 前置、分镜与场景 B–F 已迁 [guides/demo-scenes.md](../guides/demo-scenes.md)；本文件只留合同（动议 / 验收 / 已知边界）。

## 验收判据

- 一场完整会话日志（`$DSH_HOME/sessions/`）——CEO + 四 VP 会话都在
- `deliverables/` 有本动议的定稿（CEO `present` 声明过）
- 任务板出现过 **DAG 依赖**与 **≥1 次跨 VP 互审**（消息 + 回执 + 修订号变化）
- 证据归档：真实动议的会话与工作区已移私有仓；本仓只保留**合成** fixture（非本场实测证据）

**R4 加判据（交付物三态，整场通用，机器判）**：

- 收场跑 `node checks/audit/deliverables-check.mjs` 必须 **0 违规**——即 `deliverables/` 下每个
  `<slug>/final.md` 都能回溯到**一次 CEO 的 `present`**；`drafts/` 里的稿子不算成品；
  `kb/**` 不在判据射程内。判据语义与三个设计决定见 `notes/archived/2026-09-22-r4-workshop-flow.md`。
  「CEO 的 present」按**会话形状**核 = Lead 根会话（`agentPreset=ceo` 且 `delegationDepth=0`）的
  present；本句 = 角色措辞与会话判据的**单点映射家**——公司手册「只有 CEO」的角色措辞与此同指
  （单操作者与多人模式成品都只从 CEO 门出），手册侧的「映射单家」即指此处。
- 审**归档快照**要加 `--only <slug>`：快照的 `workspace.expected/` 是整盘拷贝而 `sessions/` 只装
  本轮日志，不给作用域会把历史成品误报成"无 Lead 背书"（那是输入不成对，不是违规）。
- 一条反证基线：往 `deliverables/<日期>-<slug>/` 塞一份没被 `present` 过的 `final.md`，该检查必须变红。

## 已知边界

- 动议必须在 **Web 面**跑（preset 只在 Web 面挂载，[architecture Note](../../notes/implemented/2026-11-10-architecture-rationale.md) §6 要点 6）。
- 团队里的 VP 是 **软隔离**（名册身份 + `team:policy` + KB 约定），不是 preset 级硬隔离；
  硬隔离在独立 preset 会话里成立（[roles-isolation Note](../../notes/implemented/2026-11-10-roles-isolation-rationale.md) §4 分水岭）。
  要让团队内成员拿到完整 preset 面，走 R3 命名委托或上游 seam（D9）。
- 五人同时在线时模型调用量上升；预算口径见 `kb/org.md`（AI 试点每案 $200/月硬顶）。
- **交付物三态是硬约定，不是习惯**：`packages/company-pack/content/AGENTS.md` 的「交付物三态」一节随每个成员
  会话首帧注入，`node checks/audit/deliverables-check.mjs` 机器核对。写错位置（比如职能自己写 `final.md`、
  或把排练产物平铺在 `deliverables/` 根下）会被判据报出来。
