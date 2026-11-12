# 培养回路与学习载体（方法层）

> 什么时候读：改培养/方法层、journal 收敛，或扩 `/cultivation` 时。
> 角色语义与名册 = [presets.md](./presets.md)；数据落点 = [data-model.md](./data-model.md)。

## 培养回路与学习载体（分身成长条目出生，2026-09-24；2026-10-13 培养卡扩三面）

**培养动作分三面**（2026-10-13 培养卡拍板：对象 = 公司盘×角色，人人培养自己的分身）：

| 面 | 动作 | 谁 |
|---|---|---|
| **通用方法**（pack skills） | 改 `packages/company-pack/presets/<role>/skills/`——跨公司可复用的方法论 | 维护者（repo 写权限 = 培养权不变） |
| **角色方法层**（2026-10-13 新增；2026-10-17 加 GUI 行动面；2026-10-28 M3 公司级） | 本人采纳培养记录 ⇒ host 写 `<DSH_HOME>/company/methods/<role>/<slug>/SKILL.md`——公司级、按角色隔离、pack 升级不擦；旧 `<profile>/company-cultivation/` 只读留一版 | 角色驾驭者（人）在培养面板点「采纳」或敲 `/cultivation adopt`——**同一条人侧命令通道**（面板经 `remote.commands.execute` 发同一行命令，host 照旧记 `source: user`，角色闸不变）；分身只能用 `cultivation_propose` 工具提案 |
| **素材**（journal） | 角色会话收工纪要，人审后按「轮末收敛」压进 CHARTER | 分身写、人收敛 |

**名册外的能力档**（worker family / `quality-loop-*` 两档）不走 `/cultivation`（名册 = 六角色）：方法由**人**直接放进 `<DSH_HOME>/company/methods/<能力档 id>/<pack>/`，v1 没有采纳/撤回流水线（扩名册是另一张卡；质量环见 [presets.md](./presets.md) 名册）。

**培养记录 = 公司盘 `cultivation/records/*.md`**（纠正/建议/采纳回执/验证引用；UI 经
`workspaceFiles` 读、分身经 fs 读——写留日志）。闭环：纠正或跨角色建议（CEO 仅建议权，
目标角色本人采纳）→ 本人采纳 → 方法落方法层 → 新会话生效 → 同类任务验证回填（`verify`）
→ 不灵可撤回（`revoke`）。每次验证都附一项采纳后的相似工作事实，pass/fail、证据和时间追加到记录历史；失败只记为观察、不自动撤回。缺少原始出处显示为未记录，不推断来源或自然人身份。数据诚实 = 不可达 ≠ 0、未验证 ≠ 已掌握。机制与判据 =
[cultivation-method-layer-probe](../../probes/session-context/cultivation-method-layer-probe.mjs)。**撤回/对账的完整性（2026-11-13）**：records 不可达 → 拒绝 `revoke`；本 workspace 无采纳记录时需 `revoke <slug> --orphan` 显式确认（方法层 home 级、records workspace 级，0 条 ≠ 全局无记录）。`check` 排除 `revokedAt`、计入坏记录、非法 `methodSlug` 报「记录坏」而不是抛错；legacy 迁移的非法 slug 隔离到 `.legacy-invalid/`，不进方法根。
**可选参考背景（2026-10-23）**：`/cultivation correct|suggest` 接受可选的
`--context=<base64url(ref JSON)>`（GUI 培养面板发出；不带 flag 的旧语法逐字不变）。命令只带引用
（session/成品 path + turn/address），**host 读后**把自包含 `contexts`（kind/ref/title/at/turn/excerpt/
truncated）写进记录 frontmatter；客户端只做预览。有背景或 `--work=` 时正文可空（方法正文回落为期望句）；
两者都无仍必填。
成品只认 `kb/deliverables-index.json` 条目；host 读不到就不落记录。背景随记录共享、相关角色可见；
只取用户/助手文字（排除 tool/reasoning/checkpoint）。teammate 会话只做背景源：记录按 Lead（CEO）身份
记账，成员继承 CEO 的方法层——指向成员名的 suggest 改不到该成员。机制判据 =
[cultivation-context-probe](../../probes/session-context/cultivation-context-probe.mjs)。

**生效边界按面**（D25；依据 = vendor 源码 + [2026-09-24 活体探针](../../notes/archived/2026-09-24-twin-cultivation.md)）：

| 改动面 | 生效时点 | 依据 |
|---|---|---|
| persona / 组合文件（工具行、skill 根） | **新会话**（运行中的会话保持自己的 generation）；⚠ **新增依赖模块 / 新行解析时还须重启观察窗**——2026-09-29 实测：旧进程上新开会话仍是 25 工具（无 `web_search`），重启后 27 工具含之（该轮两个变量同时变，故取稳妥口径） | vendor `agent-preset` 的 preset stamp 机制；**活体已跑**（2026-09-29 联网整治，见 [role-web-access](../../notes/archived/2026-09-29-role-web-access.md)） |
| skill 正文（`SKILL.md` body，含方法层） | **同会话下一轮**（`get()` 每次读盘） | 活体实证（日志工具结果层）+ vendor 源码一致；**修正** 2026-09-22 U1"只有新会话变"（U1 量的是模型转述） |
| skill 条目（增删改名，含方法层） | 下一轮（pre-step digest 重算 → 替换目录注入）；2026-10-13 实测 watcher 连**运行中会话**的 catalog 都会刷新（探针 NOTE 行） | vendor skill digest；培养决定 = [twin-cultivation](../../notes/archived/2026-09-24-twin-cultivation.md) |
| 方法层撤回（`revoke` 删目录） | 删除后新会话不再加载；已加载进历史的正文不回改（append-only） | 2026-10-13 机制探针 |

**培养验收**：完整完成定义 = [preset-change-definition skill](../../.agents/skills/preset-change-definition/SKILL.md)（次序/最小证据/场景义务的唯一家；`pnpm test`/`preset-smoke`/场景义务都在那里）。本段只补“培养内容”特有的一条：`probe-smoke --full`（5–10 分钟，内容质量档）按需跑，不是完成门槛——最小证据按 skill + [tests/README](../../tests/README.md) 的改动面选择。方法层机制改动另跑
[cultivation-method-layer-probe](../../probes/session-context/cultivation-method-layer-probe.mjs)（keyless 真 boot；
判写隔离前先钉 `DSH_PERMISSION_MODE=workspace-write`——本机 Seatbelt 禁用时 env.sh 的
danger-full-access 处方会让围栏缺席，这是机器条件不是机制缺口）。

**学习载体 = workspace journal 唯一**（D8：`kb/<role>/journal/`，经工具调用进日志）。
提升回路 = **人读 journal → 提炼 → 写进 pack skills**：只采纳有证据的教训、不自动提升、
单人维护者的 bus factor 写进风险（照 DSH `human-review-skill-maintenance` 提案取舍）；
提升文本只写方法论、不含公司事实与出处（D17——出处留收尾 Note，pack 换公司可复用）。
**分身运行时自改 skill 已否决**；写隔离实测口径（2026-10-13）：**workspace-write 部署下**
分身 fs 写方法层被沙箱拒（`[sandbox: file access denied]` 活体留证），danger-full-access
部署无围栏——不宣称绝对隔离；采纳/拒绝/撤回/验证只走 `/cultivation` 人侧命令
（不经模型、run 进会话日志），模型侧无这些动作的工具。
