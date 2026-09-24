# 2026-09-24 · 驾驶舱·人机协作线：注意力中心 + 审批闸门 + 问询路径 + 培养面板

状态：proposed（2026-09-24 晚主线改向后落盘；三个设计分叉**已自裁**〔依据用户指示：设计分叉默认自裁、仅真卡住才问人；各节含理由与落选方案〕；执行待"继续下一条"触发）

## 问题

这家公司不是"纯 agent 自治组织"，是"人 + agent"的经营体：agent 协作之外，会停在三个地方等人——
**通知人**（做到哪了）、**问人**（要信息）、**等人批**（要授权）；而 agent 能力靠人养（培养是一等
公民，不是后台维护）。现状四缺口：

1. 驾驶舱（在场板 + 动态流）只是**观察窗**：看得见谁在忙，看不见"**谁在等我**"；
2. 审批只存在于**内容层**（`kb/org.md` 签字线、手册承诺权），没有机制停点——agent 不会真的停下来等签；
3. 问询只有 CEO 有工具（ask-user），VP 刻意无（R3 汇报线定案），且跨会话无聚合显示；
4. 培养（journal → 人审 → skill 提升，D25）是后台开发任务，不在驾驶舱体验里。

## 机制盘点（rc.2 已核实——驾驶舱线**不需要升 pin**）

| 节点 | 机制载体（vendor rc.2） | 现状缺口 |
|---|---|---|
| 问询 | `packages/interaction/tool-ask-user`（agent 暂停问人）+ `user-questions`（问题/答案 seam）；CEO preset 已挂此行 | VP 无（刻意）；跨会话无聚合 |
| 审批 | `packages/interaction/user-approval`：`ctx.approval`；`approval/asked`/`approval/decided` 事件进会话日志（invariant 轮内配对）；**answerer waterfall 可由 pack 组合**——"这单谁批"可路由；policy ask/never、fail-closed | pack 未组合 answerer；公司签字线未接机制；无待批显示面 |
| 通知 | 无界面外 egress（搁置池 d 判定不变）；但**驾驶舱内通知可从会话事件推导**——`remote.session.follow` 事件流（在场板已在用）携带 `tool.call` / `approval/asked` / `present` / `turn/end` | 无聚合面 |

实证基础：r2-motion 五份会话日志均含 ask-user 与 approval 相关字样（lead.jsonl `tool.call` 事件 ×133）——
具体**调用形状**（真发生 ask-user 调用 / `approval/asked` 事件 vs 工具目录与上下文字串）由切片一第一步
实证，不在本 RFC 预设结论。

⚠ 已知边界（`user-approval` README 原话）："Requests are valid only inside an open turn — a durable
out-of-turn approval workflow is deferred"——审批闸门第一版设计在**轮内语义**（agent 提案时请求、人当场
批）；跨轮审批是上游 deferred 项，不自行发明。

## 切片一 ·「需要你」注意力中心（四切片的公共显示面）【已实施 2026-09-25 凌晨】

- **干什么**：驾驶舱新增聚合面，跨会话收集四类"等人"状态：**待答问询**（ask-user 挂起）、**待批审批**
  （`approval/asked` 未决）、**完成通知**（`present` / 动议收口 / journal 收尾）、**升级待处理**
  （切片三甲：VP→CEO 的【待澄清】升级消息）。每条 = 谁 / 什么事 / 等了多久 + **一键跳到那个会话**
  （成员空间入口已有）。
- **聚合范围（自裁）**：公司 workspace **全部会话**，不限于 team roster——独立 VP 会话在内（切片三乙
  的问询就出现在那里）；sessions store 已在 client 注入面。
- **实施实况（比原计划更好的机制，实施期发现留痕）**：问询/审批不走"折会话日志"，改走 **`ctx.remote.$on`
  远端事件观察者**（`user-questions/request` / `approval/request` waterfall——vendor `ui-approval` /
  `ui-user-questions` 同款载体；只登记、永远 `next()` 委托，真应答仍归官方 UI）——跨会话、实时、
  自带会话归属（`scopeOf(this)`），零流订阅成本。完成/升级仍走 follow 流折算（present 调用 +
  【待澄清】消息）。交付物：`src/lib/attention.ts`（读模型）+ `attention-registry.ts` + `AttentionTab`
  （页签 `company-attention`，排在五页签之首）。
- **验收实况**：keyless 单测 9/9（`tests/attention.spec.ts`，全套 166/166）+ client-load 真页面零挂载
  失败 + **真模型证据**（CEO 会话挂起 `ask_user_question`：tool/call 无 result、turn 保持打开 =
  agent 真停在等人；排练场跑、payload 与面板 `what` 字段同形）。**已登记缺口**：面板 DOM 最后一跳
  （远端事件 → 面板行）未上浏览器断言——归切片二的 e2e 一并覆盖（该 e2e 本就需要审批出现在面板）；
  「不讲解也能看懂」走查留用户（发现问题的出口 = 视觉打磨二期条目）。

## 切片二 · 审批闸门（公司签字线变机制停点）【已实施 2026-09-25 凌晨】

- **干什么**：`kb/org.md` 签字线接上 `ctx.approval`——需要签字的动作由 agent 主动请求审批；注意力中心
  显示待批项；人批完 agent 同轮继续。
- **第一版闸什么（自裁）**：**现行双签线**——毛利 <30% 或折扣 <9折 ⇒ CFO 在 `project-economics`
  测算触线时、给出结论前请求审批。理由：规则是**现行的**（非发明）、多数真动议自然触发、CFO skill
  已算出这两个数、全链路（agent 请求 → 人批 → 同轮继续）可走通。落选：present 前闸（present 本就
  CEO 亲手做、人又是动议发起者——语义弱且每场多一道）；新增固定支出（触发面窄，要专门造动议才看得见）。
- **实施实况**：工具 = `request_signoff`（`src/index.ts` host 半注册；`src/lib/signoff.ts` 纯函数映射），
  挂载面 = **既有 `company-client` bundle 行**（无需新行——r2-motion 实证 teammate 可见全局工具行）；
  **应答路径 (a) 成立**——web bundle 自带官方 `ui-approval` 人答面板（`Allow once`/`Reject`），不需要
  自建公司 answerer；事件对 `approval/asked`+`decided` 进会话日志；**迟连浏览器也能收到挂起审批**。
- **验收实况**：keyless 单测 5/5（`tests/signoff.spec.ts`，全套 168）+ 培养四门禁全绿（verify / test /
  preset-smoke / **probe --full 15/15**）+ **总验收 e2e 7/7 全回路**（`scripts/attention-e2e-smoke.mjs`，
  真模型 + 真浏览器：触线 → asked → 注意力面板 DOM 显示〔切片一缺口闭合〕→ 人点 Allow once →
  decided(allowed-once) → 同轮收口；截图 = `snapshots/attention-e2e/2026-09-25/`）。
- **实施期两笔大发现（留痕）**：① **COO 失控编排**——知识探针三连超时，日志实证 COO 把事实题办成
  整场团队动议（spawn×3 + 27 步单轮），修法 = COO persona 加「事实直答」纪律线（培养事件，探针修后
  15/15）；② **pack 双编译面拆分**——host 代码把核心包 Context 类型增强拉进单程序会遮掉 client 面
  sessions 类型，按 vendor 形态拆 tsconfig.host/client + solution root；连带 §7 构建配方更新与
  「preset 内容即时生效 ≠ 代码面即时生效（不重建 lib = 改动永远不生效）」的实证教训。

## 切片三 · 问询路径（自裁：甲乙都做，作用域天然不重叠）

现状：CEO 有 ask-user；VP 无（"VP 不直接问用户"，问题升级回 CEO——R3 汇报线定案，动议语境）。

- **甲 · 动议内 = 升级中继显性化（并入切片一）**：VP teammate 本就**没有 preset 工具面**
  （[design/roles-isolation 分水岭](../../docs/design/roles-isolation.md)），只能走 send_message 升级 CEO——
  注意力中心把升级链显示为第四类条目（"待转述 / 待处理"）；VP skill 加升级约定（消息带【待澄清】
  前缀）供确定性识别。纯显示层 + 内容约定，承诺权不动。
- **乙 · 独立 VP 会话 = 直接问人（独立小步）**：VP preset 工具行加 `tool-ask-user` + 手册区分两种
  模式（"动议内升级走 CEO；独立会话可直接问人"）。依据：独立会话本就是"和你的职能 agent 直接对话"
  形态（'每人养自己的 agent'的主场）；且 teammate 不挂 preset 工具面 ⇒ 乙**不会**影响动议内承诺权
  （R3/D18 不动）。preset 改动走培养验收四门禁。
- **落选**：动议内也直问（毁单一对外口径，且 teammate 机制上无从挂）；只做甲（独立会话里 VP 反而
  不许问人，与体验矛盾）。

## 切片四 · 培养面板（养 Agent 成为一等体验）

- **干什么**：驾驶舱加"培养"面——每角色：自上次人审以来的**新 journal 教训**（待审收件箱）、最近提升
  的 skill、探针状态（上次 `probe --full` 结果）。让人审提升从后台任务变成驾驶舱日常动作。
- **衔接**：已排队的「记忆收敛 + 培养轮 3」是其素材地基（收敛后 journal 只留当前轮，面板读"当前轮
  未审条目"——收敛未做前面板先以 baseline 标记运行，不阻塞）。
- **验收**：keyless 读模型（journal 差分 → 待审清单纯函数）+ client-load + 真 journal 数据渲染走查。

## 收件人模型（自裁）

**v1 单操作者 + owner 字段 + answerer 路由表形状**：每个注意力 / 审批条目带 `owner`；公司 answerer
（若走切片二 b 路径）按"签字线 → 收件人"路由表取收件人，v1 全部路由到唯一操作者——"不同的人养不同
agent"的多人未来在数据模型上不堵死。落选：现在就建多人模型（无 seam，违反不发明纪律）；硬编码单人
无 owner 字段（将来要迁数据）。界面外推送（多物理人收件）仍住搁置池等 seam。

## 输掉的方案

- **先升 pin 再做驾驶舱**（投影架构更漂亮）：机制盘点证明三节点在 rc.2 全部可用——升 pin 已挪触发型
  ⏸（材料备于 research/）；输给"体验优先、不为架构买单"。
- **通知走界面外推送**（桌面通知 / email）：无上游 seam（搁置池 d 判定不变），v1 的收件人就在驾驶舱
  前面坐着；复活条件照旧。
- **审批全闸**（所有对外文本都要批）：毁掉动议节奏，agent 变成事事请示；第一版只闸一条最"经营"的线。

## 非目标

不动 vendor；不做界面外推送；不升 pin；不动承诺权（切片三乙只加独立会话直问 + 手册两模式注记，
动议内口径不动）；不建跨轮审批（上游 deferred，不自建）。

## 风险

follow 流的事件覆盖面（ask-user / approval 事件是否真进流）未实证——切片一第一步兜底；`user-approval`
轮内边界限制审批场景形态（第一版避开跨轮）；跨会话聚合的会话发现面（team roster 之外的独立会话）可能
要补枚举逻辑；companyDash 自有 remote 在升 pin 后的装配细节（remotes client 固定装配）待升级时再核。
