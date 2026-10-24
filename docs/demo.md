# demo · 动议操作合同

> 什么时候读：要启动公司看效果、演示前核对判据时。路线 = §前置（起观察窗）→ 分镜 → 验收判据。
> 顶层合同：demo 的剧本、分镜与观测点。R1 雏形（两人公司单动议）已并入本篇；R2 按
> [design/ui-demo.md](./design/ui-demo.md) §3 分镜 v0 重排为**两空间镜头**并加场景 B；
> **R4 定稿、后补场景 D/E**：R4 立的是场景 C（写作流水线）+ 交付物三态的落盘形状与**机器验收**（`deliverables/<日期>-<slug>/`，A1 命名）；
> 场景 D（季度经营会）与 E（事件复盘）是 2026-09-25 新增动议类型的实战（见下方对应节）。

## 动议（R2）

> 把我们的对账 / 票据核对能力产品化，卖给现有 9 家客户——做不做、怎么定价、接不接得住

选它的理由：一条动议同时需要四个职能的判断（市场与定价 / 技术可行性 / 交付承接 / 毛利与合规），
且与公司已有的财务 agent 案（旧平铺形状的 `deliverables/finance-agent-workflow-vp-eng.md`——**该形状已废止、文件已不在**，2026-09-26 核实；此处只作历史对照）。

## 前置（本机）

**启动口令约定**：在本仓库上下文中，“启动一下这个插件”“启动一下这个”或“把这个跑起来”，默认指启动当前 Dream Team company pack 的独立 DSH Web 环境。完成定义是：使用仓库隔离 home，启动一个非 3080 的新 DSH 端口，拿到带 token 的 URL，并通过插件挂载冒烟；这一步不包含创建会话或运行 demo，除非用户另行指定。

**呈现即验证**（2026-09-30 立，用户裁定；规则唯一见 [dev-loop §1](./guides/dev-loop.md)）：替人起观察窗 = 先自己跑通本节（boot 横幅 + roster + client 零挂载失败），红了当场修，全绿才交 URL——用户不当第一次验收员。
**机器腿 = [cdp-probe](./guides/cdp-probe.md)**：`node probes/browser-visual/cdp-probe.mjs '<URL>'` 对运行中实例断言真实渲染（composer/品牌/全部公司页签/console 零 error；`--ask` 加一次真实调用全环）——红了当场修的判据就是它的 verdict。

1. `source run/env.sh`（双 home；**新 shell 必须**）。**自证落对了 home（10 秒，自检代替警告）**：
   `pnpm dsh --profile web --dump-config | grep -c company-pack` 必须 **≥1**；得 **0** 就说明你起的是日用 `~/.dsh`
   ——那里**也有个同名 `web` profile**（装的是日用插件集、没有公司五角色），或 pack 没装。不 source 的失败是**静默**的：
   起得来、不报错、五角色一个不出现。**计数 ≥1 同时证明「不必再 `plugin add`」**（dev web profile 已 `link:` 装好）。
2. `pnpm dsh web -- --port 0 --no-open`（**端口是环境状态不是仓库事实**：`--port 0` 交系统分配，端口与 token 从启动横幅读；
   要固定端口就先 `lsof -nP -iTCP:<port> -sTCP:LISTEN` 确认空闲——固定端口的回报是浏览器 origin 不变，工作区连接与面板布局能留下）
3. 浏览器打开该 URL（**必须带 token**：直接开端口会卡鉴权）。**先连工作区**——会话列表按【工作目录】
   过滤，不连就看不到本场会话。两条入口：空态页点主区的 **Choose workspace**；已有工作区时走侧栏
   `Workspaces` 旁的 **Add workspace** 图标。对话框里**必须先点 `Edit path`** 才会出现路径输入框 →
   粘贴 `company-workspace` 的绝对路径（= **dev run bundle 的 workspace**；fresh clone 先跑 `pnpm bundle:init`）→ 回车 → `Open`。
   ⚠ **这一步最容易漏**：对话框默认是目录浏览器，不点 `Edit path` 看不到粘贴框（2026-09-23 实测，
   用户与代理都卡过）。平台 UI（vendor 只读）改不了，写进 runbook 代偿。
4. 新建会话：preset 选 **梦之队 CEO**（`ceo` 是 profile 默认）；工作目录 `company-workspace`
5. 需要收窄过程详情时，在 Settings 的「工作步骤展示」选择 `compact`（还有标准/详细/完全展开）；实测：简洁/标准/详细都把过程行折起来，选**完全展开**才逐条展开（同一会话 2.5k vs 19.9k 字符）。它只减少工具调用细节，**不折叠助手最终长回复**——`/compact` 是另一条历史压缩命令，不用它代替显示模式验收。
6. 在会话中打开交付物文件后，使用右栏文档预览的 **Open in app / 在应用中打开** 控件调用本机应用；「在侧边栏打开」只负责把目标文件带入右栏预览，两者不是同一动作。入口不可用时记录现场环境和失败位置，不以源码存在或静态配置代替验收。
7. 进“另一位成员的空间”：**teammate 的会话不在顶层列表**——在会话头部点 **Team 名册**，点成员名打开其会话（`uiWorkspace.openSession`，子会话；rc.2 现行 API，旧 `sessions.openSubagent` 已移除）。显式入口 = 右栏「在场」页签的在场板**行可点**（条目 ② 起为平台页签，可拖出成浮窗并看）。
8. 收场验收：`node checks/audit/deliverables-check.mjs`（交付物三态；审归档快照要配 `--only <slug>`，
   因为快照的 `workspace.expected/` 是整盘拷贝而 `sessions/` 只有本轮日志）

## 分镜 v0（两空间镜头：谁在哪个空间、活怎么交接）

| # | 空间 | 镜头内容 | 观测点（外部可验证，不讲解也能看懂） |
|---|---|---|---|
| 1 | CEO | 收到动议，先澄清目标/约束/验收 | CEO 复述动议并列出三点，不直接开写 |
| 2 | CEO | DAG 拆解：建任务 + `blockedBy` 依赖 + 指定 owner | 头部「任务板」按钮（开右栏页签）或「公司」视图·看板出现多行任务：owner 分别是 VP-Sales/VP-Eng/COO/CFO，依赖徽章非空；任务文本声明了依赖而板面没有边时，卡上另带 `⚠ 声明依赖未落板：…` |
| 3 | CEO | `spawn_teammate` 拉起四个职能 | 名册出现 CEO + 四行成员，状态 running/idle 实时变化；任务板成员栏同步 |
| 4 | **切到 VP-Eng 会话** | 它读自己的 KB、消化 brief、出稿 | 会话里能看到读 `kb/vp-eng/CHARTER.md` 的工具调用；产出写入 `deliverables/` |
| 5 | **切到 VP-Sales 会话** | 市场与定价判断（MEDDIC 六问 / 双向估算） | 引用 `kb/vp-sales/` 客户事实；数字带【事实/假设】标注 |
| 6 | VP 之间互审 | 一封 `send_message` 从 A 空间到 B 空间，B 回执 | 两个会话里都有消息记录；任务板修订号（`id@rev`）增加 |
| 7 | COO / CFO 会话 | 交付承接核查 / 毛利与合规意见 | COO 报并行项目池与人力；CFO 给毛利底线与 SoD 闸门 |
| 8 | 回 CEO | `wait_agent` → 读板 → 合稿 → `present` | 交付卡片出现；分歧被保留（如 CFO 保留意见与销售定价冲突没被抹平） |
| 9 | 收尾 | 记账 | `kb/<role>/journal/` 各追加一篇 |

**镜头纪律**：每一步先指"这是谁的空间"（会话头部/侧栏），再指"活怎么交接"（任务板 owner/依赖、
消息记录）。跨空间动态：「在场」页签的动态流 = `session/follow` 流式（打开即见全程；消息级聚合留
升级路径——原「搁置池」项已随 D32 队列层退役归档，见 docs/index.md D32 行）；另可走「公司」视图四面板 + 各空间对话流。

## 验收判据（R2）

- 一场完整会话日志（`$DSH_HOME/sessions/`）——CEO + 四 VP 会话都在
- `deliverables/` 有本动议的定稿（CEO `present` 声明过）
- 任务板出现过 **DAG 依赖**与 **≥1 次跨 VP 互审**（消息 + 回执 + 修订号变化）
- 归档为 `snapshots/replay/foundation-workspace/`（沿用 R1 形状：会话 JSONL + workspace 期望态）

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

- 动议必须在 **Web 面**跑（preset 只在 Web 面挂载，[architecture §6](./design/architecture.md) 要点 6）。
- 团队里的 VP 是 **软隔离**（名册身份 + `team:policy` + KB 约定），不是 preset 级硬隔离；
  硬隔离在独立 preset 会话里成立（[design/roles-isolation](./design/roles-isolation.md) §4 分水岭）。
  要让团队内成员拿到完整 preset 面，走 R3 命名委托或上游 seam（D9）。
- 五人同时在线时模型调用量上升；预算口径见 `kb/org.md`（AI 试点每案 $200/月硬顶）。
- **交付物三态是硬约定，不是习惯**：`company-workspace/AGENTS.md` 的「交付物三态」一节随每个成员
  会话首帧注入，`node checks/audit/deliverables-check.mjs` 机器核对。写错位置（比如职能自己写 `final.md`、
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

## 场景 C · 写作流水线——专看“成品从哪来”

**故事**：给现有 9 家客户一份能直接对外发的《客户支持 SLA 承诺页》（响应/恢复时限分级 + 违约补偿口径）。

**口径（CEO 收动议时定，不新增澄清）**：slug = `support-sla-page`；不新增编制；对外承诺必须落在
COO 承接能力内；毛利不得低于 CFO 底线。

| # | 空间 | 镜头 | 观测点（外部可验证） |
|---|---|---|---|
| 1 | CEO | 收动议，定 slug 与三条约束 | CEO 会话里出现 slug 与约束；**没有**反问用户 |
| 2 | CEO | 建任务板（含 owner / blocked_by）+ `spawn_teammate(vp-sales)` + `spawn_teammate(coo)`，slug 与口径一起下发 | 名册 3 行；侧栏多出两个会话 |
| 3 | **切 VP-Sales** | 出市场与定价口径稿 | 落在 `deliverables/<日期>-support-sla-page/drafts/vp-sales.md`——**不是 `final.md`** |
| 4 | **切 COO** | 出承接与成本稿 | 落在 `deliverables/<日期>-support-sla-page/drafts/coo.md` |
| 5 | 跨空间互审 | COO 质疑 VP-Sales 的时限承诺 | `deliverables/<日期>-support-sla-page/drafts/review-coo.md`；两个会话都有消息与回执 |
| 6 | 回 CEO | 合稿 → `final.md` → `present` | 交付卡片出现；`final.md` 有“保留分歧”节，不抹平 |
| 7 | 收尾 | 三个 journal 各一篇 | `kb/{ceo,coo,vp-sales}/journal/support-sla-page.md` |

**实测基线**：`snapshots/replay/foundation-workspace/`（合成 keyless fixture；真实动议证据已移私有仓）。这一场真跑 **150 秒**
（预算 6 分钟）。**值得指出的一处**：互审稿路径 `drafts/review-coo.md` 是**模型自己**按三态约定放的
（prompt 只给了另两份）——三态合同随公司手册注入首帧，所以它会生效，不靠人盯。

**三态口诀（三场通用）**：四个职能**一律写 `drafts/`**；`final.md` 与 `present` 只归 CEO；
排练/探针产物不进 `deliverables/`（进 `snapshots/probes/<场景>/<轮次>/` 或删）。

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

**实测基线**：`snapshots/archive/q3-business-review/`（lead 428 行 + cfo + coo）。真跑 **241 秒**（预算 12 分钟），
3 人组、工具调用在限。**收敛后首场**：角色开工读的是 CHARTER「历史纪要」（46 篇 journal 已于
2026-09-25 收敛进归档），季度台账逐案引用的就是它——记忆收敛的回环第一次闭合。CFO 稿里的
「integration-50w 无 final ⇒ 未核实」正是历史纪要 + 引用两分法（候选 C）联合生效的实证。

**预算（轻任务纪律）**：≤4 人、每人单轮出稿、工具 ≤10/人、总墙钟 ≤12 分钟；不新增调研。

## 场景 E · 事件复盘（2026-09-25 新动议类型②）——专看"应急与复盘一体"

**故事**：上周五按 B 档上线的客户 X 对账模块，今晨在生产环境对账差异报警、客户投诉。先拍止血、再复盘根因与防再发——**场景 B 的续集**（同款三人组 CEO + VP-Eng + COO）。

| # | 空间 | 镜头 | 观测点（外部可验证） |
|---|---|---|---|
| 1 | CEO | 收事故报告，先拍止血再复盘（口径：根因定案权交给证据） | 止血段出现在 final（不停机不擅自回退） |
| 2 | VP-Eng | 技术根因判定：砍项≠差异源（附件不在金额比对链路）；头号嫌疑=字段口径未冻结 | drafts/vp-eng.md「已证实/待验证」分列 |
| 3 | COO | 运营根因：五条件载体实存 0 份 =「条件式承诺落地失败」；声明同类上线此后不签 | drafts/coo.md「实存 0 份」+ 不签声明 |
| 4 | 回 CEO | 合稿：止血 + 根因（区分已证实/待验证）+ 防再发三条带 owner → `present` | final.md 含时间线/根因/防再发 |
| 5 | 收尾 | **当轮收敛**（journal → CHARTER 历史纪要即清空） | 培养面板待审归 0 |

**实测基线**：`snapshots/archive/emergency-x-incident-review/`（lead 210 行 + vp-eng + coo）。真跑 **100 秒**
（预算 8 分钟）。**两处值得指出**：① CEO 客户面止血口径直接用的是**上一场季度经营会刚立的新口径**
（次工作日首响 + 10% 服务信用只抵扣不下现金）——跨动议组织记忆生效实证；② CFO 的 Q3 新口径
（补偿三口径）在本案客户面被正确引用且未越权（金额与记账口径留 CFO）。**缺口登记**：VP-Eng/COO
本轮未留 journal（W8 同款第二次）——据权威稿收敛进历史纪要，纪律缺口进观察项。

**预算（轻任务纪律）**：3 人、每人单轮出稿、工具 ≤10/人、总墙钟 ≤8 分钟；不新增调研。

## 场景 F · 多人模式（2026-09-26 立）——专看"盘上的分工"

**故事**：现实里至少 3 个物理人，**共享同一个工作目录、各自开自己的门**。客户 Z 要一份 **8.8 折**的
三年框架协议，今天要结论——CEO 立项派活、CFO 出经济性、COO 出承接，最后由 CEO 合稿。

⚠ **讲之前先记住机制边界**（否则 demo 会讲错，详见 [multi-human.md](./multi-human.md) §0）：
**一场动议里只有 CEO 的门会弹卡**——被委派的成员（含 team teammate）一律拉不到人。
⇒ 本场景展示的是**盘上的分工**；要展示"卡落到谁的门"，走下面第 3 步（**CFO 在自己的根会话里触线**）。

| # | 门（谁） | 镜头 | 观测点（外部可验证） |
|---|---|---|---|
| 0 | 甲 | 开场声明 **「这场是多人模式」**；CEO 建 `deliverables/<日期>-<slug>/`（A1 命名），把**任务书**落 `drafts/ceo.md` | 盘上出现 `drafts/ceo.md`；**CEO 没有 spawn 成员代劳** |
| 1 | 乙 | 在自己的 **CFO 根会话**里读 `drafts/ceo.md` → 出 `drafts/cfo.md` + 自己的 journal | `drafts/cfo.md` 在场；`kb/cfo/journal/` 有本轮纪要（文件名用注入的真日期；`日期待核` 仅限注入故障 fail-closed，见手册「日期口径」） |
| 2 | 丙 | 在自己的 **COO 根会话**里读同一份任务书 → 出 `drafts/coo.md` + journal | `drafts/coo.md` 在场 |
| 3 | **乙** | **在自己的门里撞签字线**（8.8 折 < 9 折）⇒ 发起 `request_signoff` | **卡只弹在乙的门上**——这就是"谁该批的事落到谁的门"的**唯一成立形态** |
| 4 | 甲 | CEO 读三份稿 → 合 `final.md` → `present` | `final.md` 在场且有一次 Lead `present` |
| 5 | 收尾 | 维护者从仓库根跑 `deliverables-check` + `journal-audit` | 三态 0 违规；各角色 journal 在场（`journal-audit` 判 ✅） |

**人之间的交接**（机制上没有通道，这是流程级）：说一句话——"CEO 派了 `<slug>`，你看一下" /
"我写完了"。协议五步见 [multi-human.md](./multi-human.md) §3。

**可直接粘贴的开场白**（把 `<日期>-<slug>` 换成当场用的，如 `2026-10-16-frame-z`；查重按**剥日期前缀的 slug**（手册 A1 命名），两处目录都看）：

```
【门甲 · CEO】这场是多人模式。动议：客户 Z 要一份 8.8 折的三年框架协议，今天要结论。
请立项并写任务书到 deliverables/<日期>-<slug>/drafts/ceo.md，分派 CFO 出经济性、COO 出承接；
不要 spawn 成员代劳。写完任务书就停，等人回话。

【门乙 · CFO】读 deliverables/<日期>-<slug>/drafts/ceo.md（CEO 给你的任务书），
按它出你的稿 deliverables/<日期>-<slug>/drafts/cfo.md，并按手册「收工留痕」写你的 journal。
⚠ 你是 **CFO 的根会话**（不是被委派的成员）⇒ 撞签字线时**由你自己发起 `request_signoff`**
（卡会落到你这扇门）；不要"升级给 CEO"——那是被委派成员的走法。

【门丙 · COO】读 deliverables/<日期>-<slug>/drafts/ceo.md，出 deliverables/<日期>-<slug>/drafts/coo.md + 写你的 journal。

【门甲 · CEO（收口）】CFO 与 COO 的稿已就位，读 deliverables/<日期>-<slug>/drafts/ 下的稿，
合稿 deliverables/<日期>-<slug>/final.md 并 present。
```

⚠ **"根会话 vs 被委派成员"是这一步的分水岭**：被委派的成员发审批**必被自动拒**
（`child-agent.ts:254` 硬编码 `never`），所以手册那条"成员触线一律升级 CEO"对它们成立；
而**每扇门都是根会话**（它自己就是那个角色的 owner）⇒ **该由它自己发起**，卡才会落到它门上。
（实测：`probes/session-context/budget-signoff-probe.mjs` 正例——CFO 根会话确实会发 `request_signoff`。）

⚠ **别在门乙/门丙那边说"你以 CEO 的身份…"**——每扇门只用**它自己角色**的权限；越权的话，
`owners.md` 的授权面就成了摆设（demo 的卖点正是"谁签得动"按人分）。

**实测基线**：两扇门排练 PASS（2026-09-26，排练场）；**真盘三扇门已跑**（2026-10-04，
firstdeal-v-2026：双签两半各落各门均人应答 allowed-once。快照 =
`snapshots/archive/memory-convergence-2026-10-04-3/`）。
**预算**：3 人、每人单轮出稿、工具 ≤10/人、总墙钟 ≤10 分钟；不新增调研。
