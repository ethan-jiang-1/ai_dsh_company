# 角色身份的 UX：让"哪扇门是谁"在每个面上一目了然（长远正确的做法）

状态：proposed（用户 2026-09-26 定方向：**选长远正确的做法，好好研究完别急**——"UX 一旦糟糕，
再漂亮的主意和技术都没用"）。本稿 = 研究 + UX 设计 + 实现蓝图；**未动手**，等用户点头。

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
| **整窗氛围（可选）** | `:root[data-wk-role="cfo"]` ⇒ 强调色（顶条/焦点环）微调 | 同上 |

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
- **B · 侧栏徽标（client）**：挂 `sidebar.session.row.leading`，读该行投影 → 色点 + 缩写。
  **验收**：真浏览器——侧栏每行行首可辨角色；非公司会话无痕迹。
- **C · 窗口标题 + 工作台徽标/色条（client）**：活动会话投影 → `document.title` +
  `data-wk-role` + CSS。
  **验收**：两个窗口并排（CEO/CFO），标题与色条一眼可辨；切换会话时同步变化。

**顺序**：A ✅（零代码）→ **B（下一步）** → C；每段一个 commit + 真浏览器验收。

## 六、明确不做

- **标题前缀当长期方案**（Cut 1）：用户已裁走长路；前缀只在 A 落地前当兜底，A 落地即退役。
- **改 vendor**（铁律）；**写字面颜色**（styling 纪律）；**靠"用户记得看某个特定面"**（违反原则 1）。

## 七、开放问题（如实列出，验收时定案）

1. **用户没看到标签变化的两个假设**：面板抑制（`activePanelId !== null`）或客户端会话仓库的
   title 未实时跟随 `session/rename`——需一次真浏览器观察定案（C 段验收顺带做）。
2. **五个角色是否都有合适的 `--dsw-*` 令牌**——不够则提上游新令牌，不写死颜色。
3. **vendor `DocumentTitle` 与我们的 title 效果并存**——我们后挂即覆盖；倾向**直接覆盖**
   （行为可预期），但需在 C 段实测确认无闪烁。

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
