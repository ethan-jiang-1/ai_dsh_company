# 2026-09-26 · 多人协作：同一个工作目录，各自开自己的门

状态：**已交付**（用户 2026-09-26 提出并批「开工」；同日交付）。用户定的边界**不许复杂化**：
不搞 client/server 结构、不搞账号体系；要求本地能模拟、回头能迁过去。**这些都做到了**。

**交付实况（六条全落）**：

| # | 条目 | 落点 |
|---|---|---|
| a | 解阻与落盘 | 队列行的"待你裁"是**假阻塞**（形态早在 §形态 自裁）；已转 ▶ 并开工 |
| b | **成员能不能拉人**（头号机制问题） | 答「**被拒**」——静态三跳 + 活体一次（探针 `scripts/member-inquiry-probe.mjs`，可复跑）；**结论重塑了 demo 形态**，见 §机制结论 |
| c | `owners.md` v1 单操作者 → **v2 多物理人** | `company-workspace/kb/owners.md`（甲 CEO 线 / 乙 财务线 / 丙 业务与交付线）+ **三条操作口径**；`routing.ts` 的代码副本同步（那份重复事实家已进磨清单） |
| d | 多门 runbook | 合同 [docs/multi-human.md](../../docs/multi-human.md) §2（含最容易漏的"先连工作区 + **必须点 `Edit path`**"） |
| e | 迁移清单 | 同一合同 §4（要搬 4 类 / **不能搬会话库** / 迁移后第一件事 = 把 owners 的甲乙丙换真名） |
| f | **一场真动议验收** | slug `sea-reconcile-2026`，见 §后果与验证 |

**合同与手册**：[docs/multi-human.md](../../docs/multi-human.md)（现在时：机制边界 / 形态 / runbook /
**§3 交接协议** / 协作前提 / 迁移清单 / 边界）；公司手册立「**多人模式**」（开场由人声明即启用）。
**接续提案**（门的边界与对齐，L1/L2/L3 分层）= [proposed/multi-human-ux](./2026-09-26-multi-human-ux.md)。

## 后果与验证（2026-09-26）

**验收（RFC §验收 三条）**：
1. **真动议跑通**：slug `sea-reconcile-2026`。**三个角色各自在自己的根会话里出稿**——
   CEO（`a58a4800`，用户自己开的门）落任务书 `drafts/ceo.md`；COO（`300bd68f`）出 `drafts/coo.md`；
   CFO（`48f3b122`）出 `drafts/cfo.md`；CEO 门（`45683352`）合稿 `final.md` 并 `present`。
   **机器验收**：`deliverables-check` **0 违规 ALL PASS**（14 成品 / 26 过程稿）；
   `journal-audit` 本场 **5 个会话全 ✅、0 缺席**（ceo/coo/cfo 三角色各自在场）。
2. **迁移清单** = 合同 §4 ✓
3. `pnpm verify` / `pnpm test` 保持绿 ✓

**★ 真盘实测抓到的两处（都写进了 runbook 与合同）**：
- **preset 默认坑**：新建会话 preset **默认 = `ceo`** ⇒ 用户开第二扇门想当 CFO 的门，实际开成了
  **第三扇 CEO 的门**，CFO 的活被 CEO 代笔。**而 `journal-audit` 查不出来**——它查"在场"、不查"作者"
  （**查在场 ≠ 查署名**）。处置：真 CFO 根会话复核并收回署名（**6 条更正**，含硬事实
  "系统集成工程师 4 名 → 8 名"）；坑进 runbook。
- **交接协议缺载体**：CEO 怎么把活交给"另一个人的角色会话"原先没定义 ⇒ 立 **§3 交接协议**
  （**CEO 自己的过程稿 = 任务书** `drafts/ceo.md`，五步全落在既有三态形状上，不新增文件类型）。
- **两扇门排练先行验证**：ceo + cfo 两个根会话走通 §3（含 `日期待核` 占位规矩），再上真盘。

**仍然开着的**（都已在别处有归宿，此处只留指针）：
- **门的边界与话题对齐**（用户 2026-09-26 的 UX 反馈）= [proposed/multi-human-ux](./2026-09-26-multi-human-ux.md)，
  已进 `ROADMAP.md` §搁置池（等用户裁 L1）。
- **上游 seam**（审批/问询按角色路由到别的会话）= §机制结论末 + §搁置池；**不自建**。
- **`owners.md` 与 `routing.ts` 的重复事实家** = `ROADMAP.md` §磨清单。


一场动议里 CEO 嚷一通、CFO/COO/VP 的分身各自干活——**但有些事分身不能替人做**（CFO 线的签字必须
CFO 那个物理人签）。现实里至少 3 个物理人 ⇒ 3 个浏览器/3 个登录，**共享同一个工作目录**。

要回答的就三件：
1. 同一 topic 下，不同角色的人**看到的是不是不一样**？
2. 他们的**通知**是不是不一样（谁该批的事只弹到谁的门上）？
3. **"CEO 的人不会去签 CFO 的事"这条边界落在哪**？

## 机制核实（vendor 只读，两行结论）

- **DSH 是单操作者设计**：没有账号体系（`identity` 只是每 harness home 一个匿名 UUID，
  `packages/identity/anonymous-user-id/README.md`）；客户端身份 = 每进程一个 launch token + 签名 cookie
  （`packages/client/connection/src/browser-auth.ts:52-58,186-196`）。**"人"这一层不存在**。
- 审批请求带 `agent` 字段，路由键是 **agent**（"a UI answerer only answers for agents it owns"，
  `packages/interaction/user-approval/src/index.ts:108-121`）——**不是"人"**。

⇒ **结论：不要试图在 DSH 里造"人"这一层。** 我们真正的共享层是**同一个工作目录**，
协作就落在文件上——这恰好是现在这套东西已经在做的事。

## 采用方案（三件事，全部现成）

1. **协作协议 = 现成的文件约定**（`company-workspace/`，**不新增机制**）：
   - 各自留痕 `kb/<角色>/journal/`；各自出稿 `deliverables/<slug>/drafts/<角色>.md`；
   - 只有 CEO 能落 `final.md`（三态纪律，机器门禁 `deliverables-check` 盯着）；
   - **人→角色与授权面 = `kb/owners.md`**（已有的事实家）；签字归属按它 + 手册的签字线判。
2. **本地模拟 = 每个角色开自己的"门"**：每个物理人一个**浏览器 profile**（或同一浏览器多标签），
   各自打开自己角色的会话——**共享同一个盘，不需要任何新结构**。模拟形态由你定（见下方待裁点）。
3. **迁移 = 搬目录**：因为协作只依赖文件（journal / drafts / final / 台账 / owners.md），
   真实环境里每人本地跑自己的 DSH、指向**同一个共享目录**（NFS / Syncthing / git 任选）即可——
   **没有 server 依赖、没有账号要搬**。迁移清单随本条目交付。

## 本地模拟配方（**零新结构**，现在就能跑）

不需要任何新机制——"门"就是**每个人自己开着的那个会话页面**：

1. **一个服务**（如 3082），三个人各用自己的浏览器/浏览器 profile 打开同一个 URL；
2. **每人钉住自己角色的会话**：CEO 的人停在 CEO 会话、CFO 的人停在 CFO 会话、COO 的人停在 COO 会话
   （Agent Teams 的成员会话在侧栏 Team 名册里点开，或搜索标题）；
3. **协作全部走共享盘 + 邮箱**：分身之间用 Agent Teams 消息；人对人用文件
   （`drafts/<角色>.md`、`kb/<角色>/journal/`、`final.md` 归 CEO）+ 口头/消息说一声"我写完了"；
4. **人该动的时候**：谁的门上出现卡，就由**那个人**答/批——这就是"CEO 的人不会去签 CFO 的事"
   在 demo 里的全部实现（**政策级**：靠 owners.md + 手册纪律 + 人在各自的门前）。

**★ 门路由 = 原生能力（2026-09-26 实测）**：两扇门同时开着，让其中一扇的 agent 发 `request_signoff`
⇒ **面板只在"请求所属会话"那扇门显示**（A=true / B=false）。也就是说：**每人钉住自己角色的会话，
"谁该批的事只落到谁的门上"就已经成立**，不需要任何新机制。

**因此那个"身份过滤"增强从"推荐"降为"可选"**（要动 client 数据层，是红线）：它只多解决
"**看得到但按不动**"这一层（防止顺手替别人按）。demo 期**不做也成立**——靠人各守自己的门 + owners.md 纪律。

## ★ 一条必须说清的区分：**路由跟着"发起 agent"走，不跟着"授权面"走**

面板按**发起请求的那个 agent 的会话**作用域（实测见上）。但"谁**有资格**签"是 `owners.md` 的授权面
（政策级）——**两者不是一回事**：

| 情形 | 面板落到哪扇门 | 业务上对不对 |
|---|---|---|
| CFO 的 agent 自己 `request_signoff` | **CFO 的门** | ✓ 正好（该签的人自己发起） |
| CEO 的 agent 代 CFO 线提交 | **CEO 的门** | ⚠ 发起者与授权面不一致——CEO 的人会看到 CFO 线的请求 |

**实测证据**：本仓 `renewal-y-2026` 那场真动议里，`approval/asked` 落在 **CEO 会话**的日志里
（即 CEO 的 agent 提交的），所以那张面板出现在 CEO 那扇门——而它是**双签线**（CFO+CEO）。
⇒ **demo 里的做法**：**让"该签的人自己发起"**（CFO 的 agent 自己提交）⇒ 请求自然落到 CFO 的门；
双签需要两人都签时，发起者用 Agent Teams 消息知会另一位（或另一位自己再发起一次）。
**不许做**：把"面板落到谁的门"当成授权判定——授权判定唯一看 `owners.md`。

## ★★ 机制结论：**人机审批是"Lead 专属"能力**（缺 seam，已转搁置池）

| 线 | 谁能发起 | 落到哪扇门 | 多人下成立吗 |
|---|---|---|---|
| **问询**（要资料/建议/规矩缺口） | **根会话**（顶层）；**被委派的成员一律被拒**（见下） | **发起者那扇门**（原生作用域） | ✗ **对被委派成员不成立**（2026-09-26 静态核实**更正**了本节原先写的"✓ 成立"） |
| **审批**（签字线） | **只有顶层（Lead）会话**——分身一律 `never` | **Lead 那扇门** | ✗ **不成立**：CFO/COO 的门收不到审批 |

**两堵墙，一处结论（2026-09-26 vendor 只读核实）**：问询与审批对**被委派的成员**都是关闭的，
只是墙在不同层：

- **问询**：`packages/interaction/user-questions/src/index.ts:101-106` —— 服务层显式守卫，
  成员调用抛 `DELEGATED_CALLER`：*"human interaction is unavailable while the calling agent is owned
  by another live agent; include the unresolved question or decision in the child agent's final result"*。
  即：**成员手里有 `tool-ask-user` 这把工具，但服务层不接**（"有工具" ≠ "能用"）。
- **审批**：`packages/subagent/subagent/src/child-agent.ts:254` —— 子会话 `approvalPolicy` 硬编码 `'never'`。

⇒ 手册里那条「**成员不直接问用户，一律升级 CEO**」**不是礼貌，是机制强制的**：成员要么把未决问题
写进自己的结果，要么走 `send_message` 升级。**这条从"纪律"升级为"机制事实"**。

✅ **已实测（①-b，2026-09-26）**：**team teammate 同样被拒**。探针 `scripts/member-inquiry-probe.mjs`
让 CEO `spawn_teammate` 起一个 VP-Eng、只让它调 `ask_user_question`，拿到的**逐字**是：

```
Error: human interaction is unavailable while the calling agent is owned by another live agent;
include the unresolved question or decision in the child agent's final result
```

⇒ `roots()` 的边界判定成立：`spawn_teammate` 内部走 `subagents.startContinuable({ parent: root })`
（`agent-team/src/roster.ts:288`），而 `parent` = **运行时归属**（`core/agent/src/index.ts:66`）⇒ teammate
有 owner ⇒ **不是 root** ⇒ 被 `user-questions` 拒。**静态三跳推断 + 活体一次观察，两路同结论。**

### ★★ 这条结论重塑了多人 demo 的形态（必须写清楚，别让 demo 讲错）

**一场由 CEO 主持的动议里，所有拉人（问询 + 审批）都只能落到 CEO 那扇门**——成员（无论是 one-shot
委派还是 team teammate）**一律拉不到人**。所以：

| 想展示的事 | 成不成立 | 怎么展示 |
|---|---|---|
| "卡落到该落的那扇门" | ✗ **动议内不成立** | 动议内只有 CEO 的门会弹卡 |
| 各人在**自己的根会话**里干活、通过**共享盘**交接 | ✓ 成立 | 每人的门 = 自己角色的**根会话**（他本人就是那个会话的 owner） |
| 某人在**自己的根会话**里触线（如 CFO 独立会话撞上签字线） | ✓ 成立 | 那张卡落到**他自己的门**——这才是"谁该批的事弹到谁的门"的**唯一成立形态** |

⇒ **多人的价值在"盘上的分工"，不在"卡的分发"**。demo 要展示"CFO 的门弹 CFO 的卡"，就得让 CFO 的人
**在自己的根会话里**触线，而不是指望 CEO 动议里的 CFO 成员。**（这也解释了为什么手册那条"成员触线
一律升级 CEO"是机制强制的。）**

⇒ **对"CEO 的人不会去签 CFO 的事"的诚实回答**：机制上**现在做不到**——一场由 CEO 主持的动议里，
**所有签字审批都只能落到 CEO 那扇门**；CFO 的人要签只能靠**流程**（CEO 的人转达 / 线下确认）。
**双签线在 demo 里的真实形态 = "CEO 的人被问一次（面板写明是双签线）"**，不是"两个人各在自己的门上签"。

**探针纪律（同场实测的教训）**：这场两门实测**误把探针跑在真盘上**（会话 cwd 用了 `company-workspace`
而不是排练场）⇒ 它在真盘留下 `deliverables/renewal-z-2026/`（含一份**从未 `present`** 的 `final.md`）
与四篇探针 journal。**门禁如实抓住**：`deliverables-check` 报 `final-not-presented`（红）⇒ 按手册
「探针产物不进 `deliverables/`」清掉后回绿（红→清→绿，一次真实的门禁反证）。
**纪律**：**探针/实测会话一律用排练场 cwd**；真盘只收真实动议。

**行为后果（同场实测）**：那场动议最后 **6/7 完成、没有 `final`**——CFO 自己发起的审批被自动拒之后，
CEO 的收口没跑完（`turn/end` 有、`present` 无）。⇒ 手册里那条"成员触线一律升级 CEO"不只是**礼貌**，
而是**不这么做动议会收不了口**。

**缺的 seam（两条，任一即可）**：① 允许配置**委派会话的 `approvalPolicy`**（现在硬编码 `'never'`）；
② 让审批请求能按**授权面（owners.md）**路由，而不是按"发起 agent 的会话"。
已转搁置池带复活条件；**不自建**（D13：这是上游能力边界，不是我们能补的）。

## 迁移清单（搬共享目录到真实多人环境要带什么）

**要搬的**（全是文件，无进程/账号状态）：
1. `company-workspace/` 整盘——`kb/`（CHARTER + journal + **owners.md** + org.md + motion-ledger.md）、
   `deliverables/`、`templates/`、`AGENTS.md`（公司手册）；
2. 插件与 preset：`packages/company-pack/`（角色 persona/skills + bundle 行 + client 皮肤）；
3. `docs/` + `notes/`（开发记忆与合同——迁过去的人要能读懂规矩从哪来）；
4. 环境：DSH 本体（同一 pin）+ 各自的 `$DSH_HOME`（**每台机器自己的**，不共享——会话库/凭据是本地的）。

**不能搬的**：`$DSH_HOME/sessions/`（会话日志是**运行时残留**，含机器专属路径；要留证据就按会话 id 归档到
`snapshots/`，别搬会话库）。

**协作前提（多人在同一盘上必须先约定）**：
1. **slug 唯一性**——见下方"实测撞车"：共享盘上 slug 就是交付物的键，两场动议撞 slug = 产物互相覆盖，
   而现有门禁**看不出来**。约定：开动议前先看 `deliverables/` 有没有同名 slug；重跑要么换 slug，要么先归档旧产物。
2. **写入边界**：各自只写 `drafts/<角色>.md` + 自己的 `kb/<角色>/journal/`；`final.md` 只有 CEO 写
   （机器门禁盯三态，但**盯不住"谁写的"**——靠手册纪律 + 互审）。
3. **同盘并发**：多人同时写同一文件没有锁（DSH 无多写者协调）⇒ 约定"一个文件同一时刻一个写者"，
   交接靠"我写完了"的消息（Agent Teams 邮箱）+ 文件本身。

**实测撞车（2026-09-26，本仓真事）**：两场动议（一场中途卡死、一场正常跑）都用了 slug `renewal-y-2026`，
于是 `deliverables/renewal-y-2026/` 里两场的 drafts/final 混在一起，`deliverables-check` 仍报
**ALL PASS 0 违规**（它只追溯"每个 final 有没有一次 present 背书"，不区分是不是同一场动议的）。
⇒ 门禁缺口已记入 §磨清单候选；多人协作时这是**必须靠约定挡住**的第一号风险。

## 边界（诚实说清，不假装是安全隔离）

- "谁该签"是**政策级**约束（写在 owners.md + 手册里，人和 agent 都照它走），**不是安全级**：
  同一台机器上谁都能按那个按钮。demo 阶段够用；真要多租户/安全隔离 ⇒ 另立条目并提上游 seam。
- 不做：账号体系、权限模型、多服务、identity 扩展、answerer 路由插件（全部留到 MVP 且需上游 seam）。

## 形态：**每角色一个浏览器 profile**（自裁，2026-09-26）

按用户既有授权「设计分叉默认自裁、仅真卡住才问人」定档：
1. ~~一个浏览器多标签~~——"人"的边界最模糊（容易顺手替别人签）；
2. **每个角色一个浏览器 profile** ← **采用**：三扇门互不串味、最接近"3 个登录"、**零额外结构**
   （且门路由是原生的，见下）；
3. ~~每次只以一个身份进~~——最干净但演示要反复切。
**可逆**：真演示嫌麻烦 ⇒ 退回 ①，不影响任何机制（路由仍按会话作用域生效）。

## 验收

- 本地用选定的形态跑一场**真动议**：至少两个角色各自在**自己的门**里干活，
  稿件/纪要/合稿沿文件约定交接成功（`deliverables-check` 0 违规 + journal 各自在场）；
- 交付一份**迁移清单**（搬共享目录到真实多人环境要带什么、注意什么）；
- `pnpm verify` / `pnpm test` 保持绿。

## 输掉的方案

- **给 DSH 造账号/权限/多用户**：DSH 没有这一层，造 = 发明（D13）+ 动 vendor（铁律禁）。
- **每人一个 DSH_HOME（分家）**：三份会话库 ⇒ 团队态互相看不见，与"同一 topic 协作"相反。
- **多服务/每角色一个服务**：用户明确否掉（不许 client/server 复杂化）；且会话 attach 互斥风险未证。
- **按角色藏内容**：同一 topic 一个真相是这家公司的卖点；藏内容 = 拆掉协作。
  **内容共享、责任分流**——分的是"谁必须动"，不是"谁能看"。
- **纯 UI 提示不做任何约束**：文案管不住行为有先例；但本轮**先只做提示**（机制约束留到 MVP），
  因为更硬的做法都要引入新结构，与"不许复杂化"冲突。

## 依据

- 机制落点见上（vendor 只读核对，2026-09-26）。
- 人侧归属：[company-workspace/kb/owners.md](../../company-workspace/kb/owners.md)；
  三档与不在场分档 = 公司手册「人机接口」节。
- 既有裁决：批准即立法（[human-agent-integration](./2026-09-25-human-agent-integration.md)）、
  依赖门槛（借设计不装）、D13 不自造。
