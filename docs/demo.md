# demo · 动议操作合同（R2 五角色版）

> 顶层合同：demo 的剧本、分镜与观测点。R1 雏形（两人公司单动议）已并入本篇；本版按
> [design/30-ui-demo.md](./design/30-ui-demo.md) §3 分镜 v0 重排为**两空间镜头**；R4 定稿。

## 动议（R2）

> 把我们的对账 / 票据核对能力产品化，卖给现有 9 家客户——做不做、怎么定价、接不接得住

选它的理由：一条动议同时需要四个职能的判断（市场与定价 / 技术可行性 / 交付承接 / 毛利与合规），
且与公司已有的财务 agent 案（`deliverables/finance-agent-workflow-vp-eng.md`）事实对齐。

## 前置（本机）

1. `source dev/env.sh`（双 home；**新 shell 必须**）
2. `pnpm dsh web -- --port 3086 --no-open`（3080 被 GUI 占用；启动横幅打印带 token 的 URL）
3. 浏览器打开该 URL（**必须带 token**：直接开端口会卡鉴权）。会话列表按【工作目录】过滤——先选到 `company-workspace`，否则看不到本场会话。
4. 新建会话：preset 选 **wochen CEO**（`ceo` 是 profile 默认）；工作目录 `company-workspace`
5. 进“另一位成员的空间”：**teammate 的会话不在顶层列表**——在会话头部点 **Team 名册**，点成员名打开其会话（`sessions.openSubagent`，子会话）。显式入口是 R5 皮肤第一项。

## 分镜 v0（两空间镜头：谁在哪个空间、活怎么交接）

| # | 空间 | 镜头内容 | 观测点（外部可验证，不讲解也能看懂） |
|---|---|---|---|
| 1 | CEO | 收到动议，先澄清目标/约束/验收 | CEO 复述动议并列出三点，不直接开写 |
| 2 | CEO | DAG 拆解：建任务 + `blockedBy` 依赖 + 指定 owner | 任务板（🗂 头部按钮）出现多行任务：owner 分别是 VP-Sales/VP-Eng/COO/CFO，依赖列非空 |
| 3 | CEO | `spawn_teammate` 拉起四个职能 | 名册出现 CEO + 四行成员，状态 running/idle 实时变化；任务板成员栏同步 |
| 4 | **切到 VP-Eng 会话** | 它读自己的 KB、消化 brief、出稿 | 会话里能看到读 `kb/vp-eng/CHARTER.md` 的工具调用；产出写入 `deliverables/` |
| 5 | **切到 VP-Sales 会话** | 市场与定价判断（MEDDIC 六问 / 双向估算） | 引用 `kb/vp-sales/` 客户事实；数字带【事实/假设】标注 |
| 6 | VP 之间互审 | 一封 `send_message` 从 A 空间到 B 空间，B 回执 | 两个会话里都有消息记录；任务板修订号（`id@rev`）增加 |
| 7 | COO / CFO 会话 | 交付承接核查 / 毛利与合规意见 | COO 报并行项目池与人力；CFO 给毛利底线与 SoD 闸门 |
| 8 | 回 CEO | `wait_agent` → 读板 → 合稿 → `present` | 交付卡片出现；分歧被保留（如 CFO 保留意见与销售定价冲突没被抹平） |
| 9 | 收尾 | 记账 | `kb/<role>/journal/` 各追加一篇 |

**镜头纪律**：每一步先指"这是谁的空间"（会话头部/侧栏），再指"活怎么交接"（任务板 owner/依赖、
消息记录）。跨空间的消息聚合视图在 R5 驾驶舱（30 §2），v0 靠各空间自己的对话流 + 任务板。

## 验收判据（R2）

- 一场完整会话日志（`$DSH_HOME/sessions/`）——CEO + 四 VP 会话都在
- `deliverables/` 有本动议的定稿（CEO `present` 声明过）
- 任务板出现过 **DAG 依赖**与 **≥1 次跨 VP 互审**（消息 + 回执 + 修订号变化）
- 归档为 `snapshots/r2-motion/`（沿用 R1 形状：会话 JSONL + workspace 期望态）

## 已知边界

- 动议必须在 **Web 面**跑（preset 只在 Web 面挂载，[10 §6](./design/10-architecture.md) 要点 6）。
- 团队里的 VP 是 **软隔离**（名册身份 + `team:policy` + KB 约定），不是 preset 级硬隔离；
  硬隔离在独立 preset 会话里成立（[design/20](./design/20-roles-isolation.md) §4 分水岭）。
  要让团队内成员拿到完整 preset 面，走 R3 命名委托或上游 seam（D9）。
- 五人同时在线时模型调用量上升；预算口径见 `kb/org.md`（AI 试点每案 $200/月硬顶）。

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
