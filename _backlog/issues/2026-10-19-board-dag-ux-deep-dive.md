---
status: 推敲中
opened: 2026-10-19
---

# 推敲：看板 + 依赖图的 UX 深挖（正确性优先：板面必须等于投影真值）

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否

## 这是什么（自说明）

「看板」与「依赖图」是公司整页视图的两个子页，实现都在 `packages/company-pack/src/client/company-panels.tsx`
（`BoardPanel` / `DagPanel`，与在场、用量合在同一文件，共 374 行）。数据面 = 会话的**团队投影** `agentTeam`
（`rows.agentTeam.val`：成员 + 共享任务列表，含 owner / 状态 / 依赖 / 修订号）。
**谁在用**：CEO/维护者把它当"公司现在在干什么"的**指挥视图**——看错 owner、状态或依赖，就会**指挥错**。
**渲染**：看板 = 按状态分列的任务卡；依赖图 = 任务节点 + 依赖边（`fitScale` 缩放适配宽度）。

## 已确立的事实（读码 + 真投影级，本轮实测；上一版没有这些）

**上一版把"正确性断言"当成本卡的核心，但没验过"真值本身"是什么样。本轮验了，结果改变了本卡的底：**

> **2026-10-19 晚订正（本卡第三版）**：下表前三行曾据 projcache 的 **state** 行得出"owner 全缺、ready 放宽"，
> 那读错了层——浏览器收的是 **wire 视图**（ownerName 273/273 齐全、ready 语义正确）。
> 前两行**已作废**（[BUG-026](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md) 是误报），
> 第三行**已修**（[BUG-027](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md) 真根因 = 徽章门槛）。
> ⇒ **本卡的核心不再是"修正确性缺陷"**（那些不成立），而是**呈现层 + 可读性**（刷新文案、依赖图措辞、窄栏）。

| 事实 | 实测 | 取法/出处 |
|---|---|---|
| 非空板数 / 任务总数 | **84 / 379**；最大板 **21**；非空板中位 **4**（"中位 0"是含 1638 个空板算的） | [调研 §三](../research/company-panels-ux/2026-10-19-panel-truth-audit.md) |
| ~~**投影里 `ownerName` 覆盖率**~~ | ~~**0 / 379**~~ ⇒ **❌ 作废：wire 视图 273/273 齐全，读模型解析出 344/379**（其余 35 张投影里真无 owner） | ~~同上~~ → 误报，见 [BUG-026 结论](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md) |
| ~~板面 owner 现状~~ | ~~**379/379 全部「未分配」**~~ ⇒ **❌ 作废：未分配的只有真没 owner 的 35 张** | 同上 |
| ~~**「依赖已就绪」徽章**~~ | ~~131 张带在已完成卡上~~ ⇒ **订正：那 131 张显示的是「等 …」噪声**（不是「依赖已就绪」）；真缺陷 = 徽章门槛不看 status，**已修**（现在 0 枚噪声） | [BUG-027](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md) |
| 声明 vs 板面分叉（drift） | **2/84 板、4 个任务**（稀有但真实） | 调研 §3.3 |
| 「每 5 秒刷新」文案 | **假**：看板/依赖图/在场走 `useSessions` 投影推送，**无轮询** | 读码 `CompanyView.tsx:102` + `use-company-data.ts:103` |
| 依赖图竖向尺寸 | 串行链 21 节点 = **高 2366px**（`fitScale` 只缩宽度、不缩高度） | 实跑 `layoutDag`（调研 §四） |
| 依赖图状态词 | `statusBadge` 对 pending 说「可开工」、对 in_progress 说「进行中」，共享同一 `wk-dag-ready` 样式 | 读码 `company-panels.tsx:64-69` |

⇒ **两个致命结论**：

1. **本卡原验收「板面 owner = 投影真值」会假绿**——真值和板面都是"未分配"，断言"相等"通过，
   但两边错得一样。**必须换底**（见下）。
2. **正确性缺陷已经不必等浏览器就确认了两条**（BUG-026 / BUG-027），而且都是**数据与读模型**层，
   浏览器截图证明不了什么也修不了。

## 本轮范围（重排后）

1. **先修数据**（读模型层，keyless 可验）：BUG-026（owner 从 `ownerId` 解，或升 pin）、
   BUG-027（`ready` 与官方 `taskProjectView` 同义）。**这一步不需要浏览器**，是本卡现在最实的产出。
2. **正确性断言换底**：用 `session_projcache` 里挑出的 1 大 + 2 中板做 **golden 快照**（落 `snapshots/`），
   断言 `tasksFromTeamView(golden)` 逐字段 == 期望；浏览器只验"DOM 渲染 == 纯函数输出"。
3. 三态：空板（1638 个空板是多数）/ 加载态 / 21 条大板 —— 各一张截图 + 读图记录。
4. 窄栏（右栏拖到最小可用宽度）下看板列与依赖边；**特别验**：2366px 高的依赖图在窄栏里是否出现
   双滚动（读码推断"会"，未实测）。
5. 刷新语义与图例文案：**文案已经确认是假的**，修 `CompanyView.tsx:102`（或改成按面板真值），带判据。
6. 分叉（drift）4 个真样本：截图确认看板的 ⚠ 徽章是否真的把它们标出来了（这是 2026-10-13 事故的
   防回归线，值得看一眼真图）。

## 范围外

- 不改任务投影本身（`agentTeam` 的产生面）与其 schema——**那是 vendor 的**，改它 = 升 pin，走 BUG-026。
- 不做拖拽改状态、不做任务编辑（新功能）。
- 不碰任务板表格（另卡：`2026-10-19-taskboard-table-ux-deep-dive.md`）。
- 不做"好看"的视觉打磨；不一致才算缺陷。

## 验证计划（步骤级）

0. 前置（分两段，第一段不需要浏览器）：
   - **A 段（keyless）**：从 `session_projcache` 抽 3 个板的 `agentTeam` 原样落 `snapshots/`；
     断言 `tasksFromTeamView` 输出；跑 BUG-026/027 的判据。
   - **B 段（浏览器）**：`source run/env.sh` → 起 web → 公司页 → 看板/依赖图子页。
1. A 段：逐字段断言（id/subject/status/ownerLabel/revision/blockedBy/ready），**owner 断言用 golden
   的 `ownerId` 反推**，不许用"投影里也没有"当通过条件。
2. B 段：按 aria/结构取出板面任务数与每张卡的 owner/状态 ⇒ 与 A 段纯函数输出比对（**不是**与投影比）。
3. 依赖边：golden 里挑 3 条真实边，断言图上 `path[data-done]` 存在且方向对。
4. 三态截图（空板 / 加载 / 21 条）+ 窄栏一张 + drift 板一张；逐张读图。
5. 收口：门禁 + 真入口复跑 + 结论回填。

## 验收标准（毕业门票，已换底）

- [ ] **owner 在真投影下不再是「未分配」**：golden 里带 `ownerId` 的 344 个任务，板面 owner 显示
      成员名（或明示"无法解析 N 项"），**断言通过**（BUG-026 的已修判定即本条）。
- [ ] **`ready` 与官方同义**：`status !== 'pending'` 时 `ready === false`；看板「依赖已就绪」徽章
      只出现在 pending 卡（BUG-027 的已修判定即本条）。
- [ ] **可复跑的 golden 断言**：3 个真板快照 + `tasksFromTeamView` 逐字段断言，keyless 跑绿；浏览器
      只验"DOM == 纯函数输出"。
- [ ] 空板 / 加载 / 21 条 / 窄栏 / drift 板 五态有截图 + 读图记录；窄栏双滚动结论有实测。
- [ ] 「每 5 秒刷新」文案与真实刷新方式一致（改文案或改行为，带判据）。
- [ ] 明确缺陷：同 diff 修 + 判据，或立 BUG 卡；门禁与真入口复跑绿；记录/索引同步 + push。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：① ~~"板面与投影一致"已被证伪（owner 全缺、ready 放宽）~~ **❌ 该"证伪"本身被证伪**：
  wire 视图上 owner 齐全、ready 语义正确（读的是 projcache state 行，见顶部订正）；② "21 条在窄栏糊"
  （要图，但已算出 2366px 高）；③ ~~"白带徽章是指挥错误"~~ ⇒ 订正为**呈现噪声**（131 枚「等 …」在已完成的卡上），已修。
- **口径**：本卡只认**读模型 + golden 快照**做基准；截图审美争议不算缺陷，**不一致才算**。
- **复核命令**：见[调研 §三](../research/company-panels-ux/2026-10-19-panel-truth-audit.md)。
  ⚠ **取法警告**：`record.rows.agentTeam.val` 是投影的 **state**，**不是**浏览器收到的 wire 视图；
  量 owner/ready 必须先过 `wire.view`（复刻 `projectTaskView` + `buildTeamProjection`），否则会重犯本轮误报。
