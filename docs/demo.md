# demo · 动议操作合同（R4 定稿）

> 顶层合同：demo 的剧本、分镜与观测点。R1 雏形（两人公司单动议）已并入本篇；R2 按
> [design/ui-demo.md](./design/ui-demo.md) §3 分镜 v0 重排为**两空间镜头**并加场景 B；
> **R4 定稿**：补场景 C（写作流水线）+ 交付物三态的落盘形状与**机器验收**（`deliverables/<slug>/`）。

## 动议（R2）

> 把我们的对账 / 票据核对能力产品化，卖给现有 9 家客户——做不做、怎么定价、接不接得住

选它的理由：一条动议同时需要四个职能的判断（市场与定价 / 技术可行性 / 交付承接 / 毛利与合规），
且与公司已有的财务 agent 案（`deliverables/finance-agent-workflow-vp-eng.md`）事实对齐。

## 前置（本机）

1. `source dev/env.sh`（双 home；**新 shell 必须**）
2. `pnpm dsh web -- --port 3086 --no-open`（3080 被 GUI 占用；启动横幅打印带 token 的 URL）
3. 浏览器打开该 URL（**必须带 token**：直接开端口会卡鉴权）。**先连工作区**——会话列表按【工作目录】
   过滤，不连就看不到本场会话。两条入口：空态页点主区的 **Choose workspace**；已有工作区时走侧栏
   `Workspaces` 旁的 **Add workspace** 图标。对话框里**必须先点 `Edit path`** 才会出现路径输入框 →
   粘贴 `company-workspace` 的绝对路径 → 回车 → `Open`。
   ⚠ **这一步最容易漏**：对话框默认是目录浏览器，不点 `Edit path` 看不到粘贴框（2026-09-23 实测，
   用户与代理都卡过）。平台 UI（vendor 只读）改不了，写进 runbook 代偿。
4. 新建会话：preset 选 **wochen CEO**（`ceo` 是 profile 默认）；工作目录 `company-workspace`
5. 进“另一位成员的空间”：**teammate 的会话不在顶层列表**——在会话头部点 **Team 名册**，点成员名打开其会话（`sessions.openSubagent`，子会话）。显式入口 = 右栏「在场」页签的在场板**行可点**（条目 ② 起为平台页签，可拖出成浮窗并看）。
6. 收场验收：`node scripts/deliverables-check.mjs`（交付物三态；审归档快照要配 `--only <slug>`，
   因为快照的 `workspace.expected/` 是整盘拷贝而 `sessions/` 只有本轮日志）

## 分镜 v0（两空间镜头：谁在哪个空间、活怎么交接）

| # | 空间 | 镜头内容 | 观测点（外部可验证，不讲解也能看懂） |
|---|---|---|---|
| 1 | CEO | 收到动议，先澄清目标/约束/验收 | CEO 复述动议并列出三点，不直接开写 |
| 2 | CEO | DAG 拆解：建任务 + `blockedBy` 依赖 + 指定 owner | 头部「任务板」按钮（开右栏页签）或「公司」视图·看板出现多行任务：owner 分别是 VP-Sales/VP-Eng/COO/CFO，依赖徽章非空 |
| 3 | CEO | `spawn_teammate` 拉起四个职能 | 名册出现 CEO + 四行成员，状态 running/idle 实时变化；任务板成员栏同步 |
| 4 | **切到 VP-Eng 会话** | 它读自己的 KB、消化 brief、出稿 | 会话里能看到读 `kb/vp-eng/CHARTER.md` 的工具调用；产出写入 `deliverables/` |
| 5 | **切到 VP-Sales 会话** | 市场与定价判断（MEDDIC 六问 / 双向估算） | 引用 `kb/vp-sales/` 客户事实；数字带【事实/假设】标注 |
| 6 | VP 之间互审 | 一封 `send_message` 从 A 空间到 B 空间，B 回执 | 两个会话里都有消息记录；任务板修订号（`id@rev`）增加 |
| 7 | COO / CFO 会话 | 交付承接核查 / 毛利与合规意见 | COO 报并行项目池与人力；CFO 给毛利底线与 SoD 闸门 |
| 8 | 回 CEO | `wait_agent` → 读板 → 合稿 → `present` | 交付卡片出现；分歧被保留（如 CFO 保留意见与销售定价冲突没被抹平） |
| 9 | 收尾 | 记账 | `kb/<role>/journal/` 各追加一篇 |

**镜头纪律**：每一步先指"这是谁的空间"（会话头部/侧栏），再指"活怎么交接"（任务板 owner/依赖、
消息记录）。跨空间动态：「在场」页签的动态流 = `session/follow` 流式（打开即见全程；消息级聚合在
搁置池，见 roadmap）；另可走「公司」视图四面板 + 各空间对话流。

## 验收判据（R2）

- 一场完整会话日志（`$DSH_HOME/sessions/`）——CEO + 四 VP 会话都在
- `deliverables/` 有本动议的定稿（CEO `present` 声明过）
- 任务板出现过 **DAG 依赖**与 **≥1 次跨 VP 互审**（消息 + 回执 + 修订号变化）
- 归档为 `snapshots/r2-motion/`（沿用 R1 形状：会话 JSONL + workspace 期望态）

**R4 加判据（交付物三态，整场通用，机器判）**：

- 收场跑 `node scripts/deliverables-check.mjs` 必须 **0 违规**——即 `deliverables/` 下每个
  `<slug>/final.md` 都能回溯到**一次 CEO 的 `present`**；`drafts/` 里的稿子不算成品；
  `kb/**` 不在判据射程内。判据语义与三个设计决定见 `notes/implemented/2026-09-22-r4-workshop-flow.md`。
- 审**归档快照**要加 `--only <slug>`：快照的 `workspace.expected/` 是整盘拷贝而 `sessions/` 只装
  本轮日志，不给作用域会把历史成品误报成"无 Lead 背书"（那是输入不成对，不是违规）。
- 一条反证基线：往 `deliverables/<slug>/` 塞一份没被 `present` 过的 `final.md`，该检查必须变红。

## 已知边界

- 动议必须在 **Web 面**跑（preset 只在 Web 面挂载，[architecture §6](./design/architecture.md) 要点 6）。
- 团队里的 VP 是 **软隔离**（名册身份 + `team:policy` + KB 约定），不是 preset 级硬隔离；
  硬隔离在独立 preset 会话里成立（[design/roles-isolation](./design/roles-isolation.md) §4 分水岭）。
  要让团队内成员拿到完整 preset 面，走 R3 命名委托或上游 seam（D9）。
- 五人同时在线时模型调用量上升；预算口径见 `kb/org.md`（AI 试点每案 $200/月硬顶）。
- **交付物三态是硬约定，不是习惯**：`company-workspace/AGENTS.md` 的「交付物三态」一节随每个成员
  会话首帧注入，`node scripts/deliverables-check.mjs` 机器核对。写错位置（比如职能自己写 `final.md`、
  或把排练产物平铺在 `deliverables/` 根下）会被判据报出来。

## 场景 B · 三角色应急协作（CEO / COO / VP-Eng）——专看"活怎么交接"

**故事**：老客户 X 的对账模块**本周五必须上线**（合同有违约条款）；研发本周只剩 1 人可用（VP-Eng 报），
COO 手上并行池已 7 个项目（上限 8）。CEO 要在这三者之间拍一个能执行的决定。

| # | 空间 | 镜头 | 观测点（视觉） |
|---|---|---|---|
| 1 | CEO | 收到"周五硬期限"，先澄清：违约代价 / 可缩范围 / 验收标准 | 澄清清单出现在 CEO 会话里，而不是直接开干 |
| 2 | CEO | 建任务 DAG：`VP-Eng 出两档方案` → `COO 核承接` → `CEO 拍板` | 任务板出现 3 行，**依赖列**指向明确（COO 那行 blocked_by VP-Eng） |
| 3 | CEO | `spawn_teammate(vp-eng)` + `spawn_teammate(coo)`，用 `send_message` 下发口径 | 名册出现 3 行；侧栏多出两个会话（= 两个独立空间） |
| 4 | **切 VP-Eng** | 出**两档**：A 全量（2 人 5 天）/ B 缩范围（1 人 3 天，砍票据附件齐套） | 会话里能看到它读 `kb/vp-eng/CHARTER.md`，结论一页纸 |
| 5 | **切 COO** | 核承接：并行池 7/8、周五前只剩 3 个工作日 → **有条件接**（接受 B 档 + 挪走 1 个项目） | COO 结论里出现容量数字与条件，而不是"可以"两个字 |
| 6 | 跨空间互审 | COO 用 `send_message` 质疑 VP-Eng 的"1 人"假设（现场支持谁顶） | 两个会话里都出现这条消息与回执；任务板修订号变化 |
| 7 | 回 CEO | 拍板 **B 档 + 挪项目**；把 A 档与 COO 的保留意见写进定稿；`present` | 交付卡片出现；定稿里 A 档写成"未采纳"而不是消失 |
| 8 | 收尾 | 三个 journal 各一篇 | `kb/{ceo,coo,vp-eng}/journal/` 各新增一条 |

**预算（轻任务纪律）**：3 个角色、每人 1 轮出稿、工具调用 ≤10/人、总墙钟 ≤6 分钟；
不许 spawn 额外 worker、不许新调研（只引用 KB 现行事实）。

## 场景 C · 写作流水线（R4 定稿的那一条）——专看“成品从哪来”

**故事**：给现有 9 家客户一份能直接对外发的《客户支持 SLA 承诺页》（响应/恢复时限分级 + 违约补偿口径）。

**口径（CEO 收动议时定，不新增澄清）**：slug = `support-sla-page`；不新增编制；对外承诺必须落在
COO 承接能力内；毛利不得低于 CFO 底线。

| # | 空间 | 镜头 | 观测点（外部可验证） |
|---|---|---|---|
| 1 | CEO | 收动议，定 slug 与三条约束 | CEO 会话里出现 slug 与约束；**没有**反问用户 |
| 2 | CEO | 建任务板（含 owner / blocked_by）+ `spawn_teammate(vp-sales)` + `spawn_teammate(coo)`，slug 与口径一起下发 | 名册 3 行；侧栏多出两个会话 |
| 3 | **切 VP-Sales** | 出市场与定价口径稿 | 落在 `deliverables/support-sla-page/drafts/vp-sales.md`——**不是 `final.md`** |
| 4 | **切 COO** | 出承接与成本稿 | 落在 `deliverables/support-sla-page/drafts/coo.md` |
| 5 | 跨空间互审 | COO 质疑 VP-Sales 的时限承诺 | `deliverables/support-sla-page/drafts/review-coo.md`；两个会话都有消息与回执 |
| 6 | 回 CEO | 合稿 → `final.md` → `present` | 交付卡片出现；`final.md` 有“保留分歧”节，不抹平 |
| 7 | 收尾 | 三个 journal 各一篇 | `kb/{ceo,coo,vp-sales}/journal/support-sla-page.md` |

**实测基线**：`snapshots/r4-motion/`（lead 234 行 + vp-sales + coo + 期望态）。这一场真跑 **150 秒**
（预算 6 分钟）。**值得指出的一处**：互审稿路径 `drafts/review-coo.md` 是**模型自己**按三态约定放的
（prompt 只给了另两份）——三态合同随公司手册注入首帧，所以它会生效，不靠人盯。

**三态口诀（三场通用）**：四个职能**一律写 `drafts/`**；`final.md` 与 `present` 只归 CEO；
排练/探针产物不进 `deliverables/`（进 `snapshots/<轮次>-*/` 或删）。

## 场景 D · 季度经营会（2026-09-25 新动议类型①）——专看“经营复盘的节奏”

**故事**：Q3 收尾。与 CEO 主导的评估动议不同，**CFO 与 COO 是内容主角**：CFO 出经营数字复盘
（结论台账 / 预算消耗 / 毛利口径执行），COO 出交付与产能复盘（池水位 / 载体四件套 / 维护口径）；
素材按 `templates/weekly-report.md`；产出 = 季度经营报告。

| # | 空间 | 镜头 | 观测点（外部可验证） |
|---|---|---|---|
| 1 | CEO | 收动议，按 assembling-the-team 组队：**只叫 CFO + COO、零 VP** | 组队理由写进 final 头部（动议没问技术与市场） |
| 2 | CEO | 建任务板（CFO 复盘 / COO 复盘 / 互审 ×2）+ spawn 两位主角 | 名册 3 行；任务含互审对 |
| 3 | CFO | 经营数字复盘：**8 案结论台账逐案带出处**、签字线三态口径、未核实明标 | drafts/cfo.md 每格带出处、「未核实」字样在场 |
| 4 | COO | 交付复盘：池水位只给区间（台账 0 ⇒ 未核实）、载体四件套实存 0 份 | drafts/coo.md「实存 0 份」+ 三问各一句 |
| 5 | 跨空间互审 | CFO ↔ COO 十条意见往返（W 归属 / 台账 owner / 三态口径） | 双方 review 稿 + 各自修订版在 drafts/ |
| 6 | 回 CEO | 合稿：Q4 优先级三条全补件 + 裁定三条 + 版本冻结 → `present` | final.md 出现「判不了」总判 + P1–P3 |
| 7 | 收尾 | 三 journal 留痕 → **当轮收敛**（压进 CHARTER 历史纪要、journal 清空） | 驾驶舱④培养面板待审归 0 |

**实测基线**：`snapshots/q3-business-review/`（lead 428 行 + cfo + coo）。真跑 **241 秒**（预算 12 分钟），
3 人组、工具调用在限。**收敛后首场**：角色开工读的是 CHARTER「历史纪要」（46 篇 journal 已于
2026-09-25 收敛进归档），季度台账逐案引用的就是它——记忆收敛的回环第一次闭合。CFO 稿里的
「integration-50w 无 final ⇒ 未核实」正是历史纪要 + 引用两分法（候选 C）联合生效的实证。

**预算（轻任务纪律）**：≤4 人、每人单轮出稿、工具 ≤10/人、总墙钟 ≤12 分钟；不新增调研。
