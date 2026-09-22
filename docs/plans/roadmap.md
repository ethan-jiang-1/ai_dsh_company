# Roadmap · 垂直轮迭代（每轮一场动议从 CEO 进出，系统先起来再逐轮加宽）

> 性质：**计划层**——被实现逐轮吞掉（验收进 docs/ 合同、决策进 notes/、过期即修订）。
> 2026-09-21 重切（D11）：原"先全角色（阶段 1）后团队（阶段 2）"的横切否决，改垂直轮——
> 交付按完整垂直切片、验证按最窄证据、打磨蛇形折回；原 M1 独立会话验证不丢，降为轮内
> 最窄验证。UI 归轮：现成团队 UI 在 R1 作观察窗、R2 进验收；自定义皮肤 R5（30 §5）。
> **每轮换全新对话上下文执行**——交接不吃上下文，靠文末两份清单。

| 轮 | 状态 | 做什么（垂直：动议从 CEO 进、交付从 CEO 出） | 轮内最窄验证 | 验收（外部可观察） | 合同/内容随之出生 |
|---|---|---|---|---|---|
| R0 立环 | ✅ 完成 | 环境：submodule 钉 tag + workspace + AGENTS.md + 双 home | `pnpm verify` 结构门禁 | `pnpm dsh --profile headless "hi"` 从源码跑通；typecheck 解析到 DSH src | `profile.md` 骨架 |
| R1 两人公司 | ✅ 完成 | CEO + VP-Eng（骨架 persona + 各 1 个核心 skill）；pack 装进 web profile 作**观察窗**（零自定义 UI）；一条最小动议（Q4 已定：「给我们公司要不要自建知识库写一页技术评估」）：收动议 → spawn teammate → 派一任务 → VP 出稿 → CEO 收口 `present` | 两角色入戏探针：**Web 会话**分别选 CEO / VP-Eng preset（⚠ headless 不挂 preset，见 [10 §6](../design/10-architecture.md) 要点 6） | **Web 会话**里一场完整动议的会话日志 + `deliverables/` 第一份交付物（UI 是唯一载体，不是红利） | CEO/VP-Eng 的 40 号文案；`demo.md` 雏形 |
| R2 全员（五角色） | ✅ 完成（机制+门禁；UI 观演待下次开窗） | +VP-Sales +COO +CFO（文案+skills）；任务板 DAG 分派；VP 间至少一次互审（mailbox 跨层级）；fork teammate 下发会议上下文；pack 头部任务板升级为**活面板**（打开期间自动刷新，成员状态/任务修订双侧实时） | 新增两角色独立会话探针；task CAS 拒绝过期修订 | [30-ui-demo](../design/30-ui-demo.md) §3 分镜 v0 按「两空间镜头」走：**不讲解也能看懂谁在哪个空间、活怎么交接**；消息不丢不重 | `presets.md`（五角色语义合同）；40 号补全 |
| R3 汇报线 | ✅ 完成（2026-09-22） | **team 两包直插行**（R1 起就已直插，本轮只做"并存不互破"的验证）；CEO 加 `vp_eng`/`vp_sales` 命名委托工具（**one-shot 前台** + per-instance persona + `maxDepth: 1`——原计划的 continuable 被 team shadow 实证否掉，见 D18）；**委派工具卡**（`tool.call.toolview` 薄片，自 R5 v2 提前——机制与它的脸同轮交付） | shadow 边界真跑取证：CEO 会话的控制名归团队版、按成员**名字**寻址（`scripts/delegation-smoke.mjs`；`--delegate` 真委派一次断言前台拿到稿子） | 委派出稿（前台拿结果）→ 再委派一次带上一稿改稿；委派卡由 **keyless 行为层**守（`tests/delegation-card.spec.ts`）+ 真页面挂载冒烟；**端到端真 UI 留给 R5 replay**；边界有回归守卫 | `delegation.md`（D18）；`notes/implemented/2026-09-22-r3-reporting-line.md` |
| R4 成品流程 | ▶ 下一轮 | templates + deliverables 流程全量接入；**共享盘卫生**（[proposed/workspace-hygiene](../../notes/proposed/2026-09-22-workspace-hygiene.md)）：交付物三态（成品 `deliverables/<slug>/final.md` 必须来自一次 `present`、过程稿进 `drafts/`、排练产物不进 deliverables）、练习场 ≠ 运行场（排练换 workspace 目录） | 模板即流程：写作类工作流第一版 = 模板 + skill 指引；keyless 交付物检查脚本 | 端到端写作流水线：brief → 分头出稿 → 互审 → 合稿落 `deliverables/`；**每份 `final.md` 可回溯到 `deliverables/presented` 事件**（oracle = `snapshots/r1-motion/session.jsonl`，加一份无 `present` 的文件即变红） | `demo.md` 定稿 |
| R5 皮肤 + 门禁 | — | [30-ui-demo](../design/30-ui-demo.md) §5 v1 驾驶舱页签（含**协作动态流**：pack 自建 Remote 折叠 session 事件；**组织在场板**（[proposed/org-presence-board](../../notes/proposed/2026-09-22-org-presence-board.md)）：每个分身一行 = preset 显示名 + `TeamMemberView.status` + 当前 `TeamTaskView.subject`，数据源 `agent-preset/selected` + `ctx.sessionQuery`，均已在 bundle 行内；v2 委派工具卡已提前至 R3）；verify / release-smoke / sync-dsh 脚本 | 发布纪律时点表（[guides/60](../guides/60-dev-loop.md) §5）逐项补；在场板读模型 keyless 单测 | 驾驶舱页签跑通（含在场板：分身接活 5s 内转 `running`）；`npm pack` → 干净 profile → `dsh plugin add` → 冒烟通过 | `release.md` |
| R6 分身成长 | ⛔ 待命（阻塞：轮间待办两条 + U1 实证） | **培养回路**：改 `presets/<role>/` 即培养动作，生效边界 = 新会话，验收 = 三道门禁 + 该角色入戏探针；**学习载体**：journal 唯一，人审提升进 skills（照 DSH `human-review-skill-maintenance` 取舍），**否决分身运行时自改 skill**；**不做自主节律**（提 upstream seam，不自建调度器）（[proposed/twin-cultivation-and-self-learning](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md)） | U1 实证：skills 热改是否下一轮生效（vendor 内部两条陈述冲突）；隔离反证（`.dsh/skills/` 探针不盖角色 skill） | 一次完整回路：动议结束 → journal 有教训 → 人提升进 pack skill → 三道门禁 + 探针全绿，且旧会话不受影响 | 培养/学习合同（名字待定） |

主通道不变（D4）：demo 主循环走团队（M4/通道 B）；通道 A 命名委托 R3 加入；M2（自定义
provider）可选增强（触发条件见 [20-roles-isolation.md](../design/20-roles-isolation.md) §3）。
UI 侧：v0（现成团队 UI）＝ R1 观察窗起、R2 进验收；委派工具卡（v2 薄片）提前至 R3，驾驶舱 v1 ＝ R5（[30-ui-demo.md](../design/30-ui-demo.md) §5）；组织在场板是 R5 驾驶舱的一个切片。

轮间待办（不占轮，R2 收尾后立刻做）：**接线修复两条**——① 五个 preset 显式关
`includeDefaultRoots`，把角色私有 skills 与共享 skill 根隔离（今天仓库内无 `.dsh/`，陷阱是潜伏的：
一旦有人往 `<repo>/.dsh/skills/` 放同名 skill，会以 rank 100 盖掉角色 skill 并对全公司生效）；
② 补 `agent-instructions` 接线（D7 的"公司手册 → project root"载体目前是空的，先跑 U4 实证再定）。
两条都不改变今天的可见行为，出处见
[proposed/2026-09-22-twin-cultivation-and-self-learning.md](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md)。

## 轮次交接（每轮全新对话上下文，靠这两份清单不吃上下文）

**新会话开工动作**（guides/60 §0.5 的展开版；人只需说"继续下一轮"）：

```text
AGENTS.md（自动加载）→ docs/00-index.md（台账 + 待定 Q）→ 本表找当前轮
→ 有 ⛔ 先解阻塞 → Plan Mode 出 decision-complete 计划 → notes/intents.md 登记 → 开工
```

**轮次收尾清单**（同一 diff 内完成，缺一即未收尾）：

1. 本表状态列勾销（🔄 → ✅，下一轮标 ⛔ 或待命）；
2. `AGENTS.md` 当前状态行同步改写（"现在"的唯一权威）；
3. 验收中已成事实的部分迁入对应合同（00-index 合同出生地图）；
4. `notes/implemented/` 记本轮 Note——"实际跑过的验证 + 环境状态"必写（下轮会话判断
   "哪些已就绪"只读这里，不信记忆不信聊天记录）；
5. `notes/intents.md` 对应行改 implemented；
6. **上线前门禁全绿**，按两层跑（guides/60 §9.1 的分层纪律）：
   - **迭代环（秒级，每次都跑）**：`pnpm verify` + `pnpm test`（后者有机械门禁
     `tests/layering.spec.ts`：回归层出现模型/浏览器/子进程/网络即红）；
   - **认证档（分钟级，每轮一次）**：`node scripts/preset-smoke.mjs`（**唯一能抓"preset 挂载失败"**
     的检查——行 config 校验发生在挂载时，roster/dump 都看不到，UI 还会吞错误；R1 血泪教训，
     见 guides/60 §7 两道防线）+ `client-load-smoke`（客户端改动）+ **内容改动**另跑
     `node scripts/probe-smoke.mjs`（会话级：真 web + 真 preset + 真模型；R2 建）与
     `handbook-smoke` / `delegation-smoke`（各自面）。
   **认证档一律不进 `pnpm test`**（R3 立的规矩，别再混回去）。

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- 2026-09-22：**R3 收尾**——R3 ✅、R4 标 ▶ 下一轮。R3 的验收口径在本轮被实证改写两次：
  ① "team 两包改直插行"其实 R1 起就已直插（本轮只做验证）；② 原计划的 `continuable` 命名委托
  被"team shadow + 按成员名字寻址"三层证据否掉，改 one-shot 前台（D18）。同时立了
  **测试分层纪律**（guides/60 §9.1：真模型/真浏览器不进回归）——起因是用户当轮指出
  "这种测试如果是 regression 的话跑得这样慢完全受不了"。详见
  [implemented/2026-09-22-r3-reporting-line.md](../../notes/implemented/2026-09-22-r3-reporting-line.md)。
- 2026-09-22：三篇提案进轮（④ 共享盘卫生 → R4、① 组织在场板 → R5、②③ 分身成长 → 新增 R6 待命），
  R6 的阻塞项是轮间待办两条接线修复 + U1 实证；原因与验收判据见各自提案（`notes/proposed/`）。
