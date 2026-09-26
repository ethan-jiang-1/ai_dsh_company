# 角色身份的 UX：让"哪扇门是谁"在每个面上一目了然（长远正确的做法）

状态：implemented（2026-09-26 三段全交付并真浏览器验收：A = 上游自带 `agentPreset` 投影〔零代码，
撤码复验 7/7〕、B = 侧栏角色徽标 `ee7b8b5`、C = 窗口标题【角色】+ `:root[data-wk-role]` + 3px 顶条；
keyless 单测 6 项 + 真浏览器自主验收 ALL PASS）。残余项「每角色一色」= 上游分类色板 seam，
住 [ROADMAP §搁置池](../../ROADMAP.md)。用户定方向的原话（"UX 一旦糟糕，再漂亮的主意和技术
都没用"）即本稿取舍依据。

## 一、用户痛点（原话）

> 开了两个窗口，一个 CEO 的、一个 CFO 的，看窗口名字不知道哪一个是哪一个……
> 反正你总得哪儿变了我才能区别出来……甚至换颜色啊干啥的都可以……
> 目前真是看不清楚。如果换了 preset，那么表达可以变的有哪些？

## 二、根因（三层，全部源码逐字核实）

| 层 | 事实 | 证据 |
|---|---|---|
| **数据** | 客户端的会话列表**根本不知道每个会话的角色**——`SessionSummary` 没有 preset 字段（只有 sessionId / updatedAt / running / blank / parentSessionId / origin / cwd / projections） | `vendor/dsh/packages/api/session-controller/src/types.ts:177-188` |
| **窗口标题** | vendor 有动态标题机制（`会话标题 — 产品名`），但**只在 `activePanelId === null` 时显示会话标题**——面板一开就退回纯产品名；产品名是构建期写死的 | `vendor/dsh/packages/client/ui-layout/src/client/DocumentTitle.tsx:19-25`；`vendor/dsh/apps/web/index.html:9`（`<title>DSH Local Build</title>`） |
| **侧栏** | 行渲染是 vendor 固定的，只显示 `displayTitle`（"persisted title, project basename, or Session id"）——角色没有立足之地 | `vendor/dsh/packages/client/ui-workspace/src/client/tree.ts:294-296` |

⇒ "换了 preset 之后哪儿都没变"**不是没做好，是这份数据从来没到过 UI**。我此前的改名（L0）
只动了侧栏标题，而用户的注意力在**窗口标题**上（那个面被面板抑制/写死）——所以"压根儿找不到"。

## 三、研究结论：上游留好的三条正路（零 vendor 改动）

1. **投影系统（数据面的正路）**——`vendor/dsh/packages/session/session-projection/src/types.ts`
   注释原话：*"Domain packages merge their client-visible key here"*。
   参照实现 = `model-selection-projection.ts`（全文 68 行）：声明合并键 →
   `satisfies ProjectionDefinition<'key'>` → `ctx.sessionProjections.register(def)`。
   **关键便利**：`init(header)` 直接拿到 `SessionHeader`——**`header.agentPreset` 就在那**；
   角色永不变 ⇒ `apply` 恒等返回原 state（零下游开销）。
   **效果**：每个会话的角色随 `session/list` 的 `projections.values` 到达客户端；
   `kind:'cached'` 的持久化投影缓存让**冷会话也带角色**。
2. **`sidebar.session.row.leading`（侧栏行首的官方装饰位）**——
   `vendor/dsh/packages/client/ui-workspace/src/client/contract/slots.ts:129`
   （`kind:'list'; scope:'root'`，拿行 sessionId）。合同原话：*"ambient row decorations"*。
   ⇒ **角色徽标的正规落点**：每行行首一个色点 + 角色缩写。
3. **本包 client 面（既有先例）**——`packages/company-pack/src/client/` 已注入
   `['slots','remote','sessions']`、已 `installStyles`（注入 `<style>`）、已挂会话头部卡、
   已用 `useSessions` 座位读 `agentTeam` 投影。**读投影、挂插槽、注样式、设
   `document.title` 全是浏览器代码本来就能做的**。

## 四、UX 设计（先体验后技术）

**原则**：
1. **一眼定向**——用户扫视的**每个面**都必须**独立**回答"我在谁的门里"；不要求用户记得去哪儿看。
2. **角色是数据，不是约定**——不靠标题前缀这种会被忘记/漂移的约定；角色从 preset **数据**
   流到所有面（投影是唯一事实源）。
3. **颜色先于文字**——并排两窗时，色差比读字快（pre-attentive）。角色色是**稳定映射**，不随会话变。
4. **优雅降级**——非公司盘/无 preset 的会话**什么都不显示**，不误导。

**四个面，各答一次"这是谁的门"**：

| 面 | 形式 | 数据来源 |
|---|---|---|
| **浏览器窗口标题** | `【CFO】8.8折毛利测算 — DSH` | 活动会话投影 + 会话标题；**我们自己的 client 效果**（不依赖 vendor 的 `activePanelId===null` 条件——那个条件在用户真实用法下不可靠） |
| **侧栏每一行** | 行首**色点 + 角色缩写**（`sidebar.session.row.leading`） | 每行的 `agentPreset` 投影 |
| **工作台（会话头部）** | 角色徽标（挂已有会话头部挂载面） | 活动会话投影 |
| **整窗氛围** | `:root[data-wk-role="cfo"]` ⇒ 强调色（顶条/焦点环）微调（已随 C 段交付） | 同上 |

**颜色的家（一处定义）**：角色→令牌映射表放本包 client 一处；颜色**一律用平台令牌
`--dsw-*`**（`docs/web-styling.md` 禁 feature 包写字面颜色）。五个角色需要五个**可区分**的
语义令牌——**这是要与上游核对的点**（见开放问题 2）。

## 五、实现蓝图（三段，每段独立可验收）

- **A · 数据面 = ✅ 零代码（2026-09-26 实测改判）**：**上游已自带同键同义投影**——
  `vendor/dsh/packages/preset/agent-preset-registry/src/session.ts:33-42`
  （*"Current Session preset, initialized from its header and advanced by selection events"*，
  `string | null`，且**跟随 `agent-preset/selected` 切换**——比我原设计的"创建时角色永不变"更对）。
  **复验（撤掉我方代码、纯上游构建）**：7/7 关键会话在 `session/list` 里带正确 `agentPreset`
  （含一例中途切过 preset 的会话显示切换后的值）；首轮全量 14/14。
  **过程教训（如实记录）**：我先按本蓝图写了一份重复实现（`{preset: string}` 形状），验收时
  **靠"值形状不符"抓出来**（列表返回的是上游的纯字符串形状）⇒ 撤销。研究阶段的漏项 =
  只查了 `api/session-controller` 的投影表声明，没查 `agent-preset-registry` 自己的声明文件；
  **验收驱动救了一次**。⇒ B/C 段直接读上游投影，不再写任何 host 代码。
- **B · 侧栏徽标（client）= ✅ 已交付并验收（`ee7b8b5`）**：挂 `sidebar.session.row.leading`
  （root 域只给 sessionId ⇒ 数据经注册 inject 面注入 `sessions.list` 快照 +
  `useSyncExternalStore`——subscribe 用 useMemo 绑一次，getServerSnapshot 补齐否则静态渲染抛错）。
  **验收（2026-09-26 真浏览器自主验收 ALL PASS）**：徽标 5 个（cfo×2 / ceo×3）行首在场、缩写全对
  （CEO/CFO/…）；非公司会话零痕迹（单测覆盖）；**未连工作区也渲染**（Ungrouped 组直接出）。
- **C · 窗口标题 + 整窗色条（client）= ✅ 已交付并验收**：根级 effect 无条件接管
  `document.title = 【角色】会话标题` + `:root[data-wk-role]` + 3px 顶部色条。
  **验收**：初始 `【CEO】company-workspace` → 点开 CFO 行即变 `【CFO】你好`、
  `data-wk-role=cfo`、顶条 3px——**与 vendor DocumentTitle 并存无闪烁**（开放问题 3 定案）。

**顺序与状态**：A ✅（零代码）→ B ✅ → C ✅（验收 `ee7b8b5` + 一次性自主验收脚本——真浏览器
连 UI 断言，未入库；单测 6 项在 `tests/role-badge.spec.ts`）→ ③ 收尾 ✅（2026-09-26 提案毕业；
「角色可见」已并入 [multi-human.md](../../docs/multi-human.md) 开门 runbook 第 4 条）。

## 六、明确不做

- **标题前缀当长期方案**（Cut 1）：用户已裁走长路；前缀只在 A 落地前当兜底，A 落地即退役。
- **改 vendor**（铁律）；**写字面颜色**（styling 纪律）；**靠"用户记得看某个特定面"**（违反原则 1）。

## 七、开放问题（如实列出，验收时定案）

1. ~~用户没看到标签变化的两假设~~ **已定案（2026-09-26 自主验收）**：根因 = vendor 的
   DocumentTitle 受 `activePanelId === null` 门控 + 构建期静态产品名；**我们的 C 段无条件接管后
   真浏览器实测标题随会话切换即时更新**（【CEO】company-workspace → 【CFO】你好）——不再依赖
   vendor 的条件，两假设无需进一步区分。
2. **分类色板：平台没有**（盘点 design-platform.css 182 令牌：只有语义状态色 error/success/
   warn/business——给角色用会误导）。**当前决定**：所有角色共用品牌色、区分靠文字缩写（已验收可用）；
   **要每角色一色 ⇒ 上游提"分类色板"令牌**（本包不写字面色——styling 纪律）。留给用户点名时再提。
3. ~~并存优先级~~ **已定案**：直接接管（后注册者的订阅后触发 ⇒ 稳定胜出），真浏览器实测
   标题稳定无闪烁。

## 八、依据（全部源码，可自行核对）

- 投影系统：`vendor/dsh/packages/session/session-projection/src/{types,index}.ts`
  （merge-extensible 两表 + `ProjectionDefinition` + `SessionProjectionRegistry`）；
  参照实现 `vendor/dsh/packages/api/session-controller/src/model-selection-projection.ts`（68 行全文）。
- 侧栏行装饰位：`vendor/dsh/packages/client/ui-workspace/src/client/contract/slots.ts:129`
  （`sidebar.session.row.leading`）与 `:27-39`（行装饰/行操作的官方说明）。
- 窗口标题：`vendor/dsh/packages/client/ui-layout/src/client/DocumentTitle.tsx`（全文 29 行）。
- 会话摘要无 preset：`vendor/dsh/packages/api/session-controller/src/types.ts:177-188`。
- 本包 client 先例：`packages/company-pack/src/client/index.ts`（inject / installStyles /
  useSessions 读 agentTeam 投影）与 `styles.ts`（令牌纪律）。
- 用户体验原话与现场：`notes/research/2026-09-26-experiment-c-quote-z.md`（实验 D 活体数据）。
