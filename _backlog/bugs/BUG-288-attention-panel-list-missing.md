---
status: 调查中
severity: P2
opened: 2026-11-20
---

# BUG-288：attention-e2e 过了语言关仍卡在「待办页签 → 待办事项列表」20s 超时

> 严重级别：P2（次要偏重：人机审批全回路这条唯一真验收入口仍不可用）｜发现：2026-11-20（端到端验收第二轮）｜状态：调查中
>
> **留痕**：端到端验收轮（2026-11-20）。
>
> **回翻说明（2026-11-21）**：本机 `approval policy=never`（`run/env.sh` 的 `danger-full-access`）⇒ 挂起项不存在、产品主张不可证；跨会话重建需换数据面。证据见卡末两节，处置见账本批次节的「中途修订」。

## 症状

BUG-287（英文可访问名）修好后，`node checks/lanes/attention-e2e.entry.mjs` 能一路走到：

```
PASS 门A（cfo）approval/asked 落日志（request_signoff）
workspace connected（自动）
session opened
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
  - waiting for getByRole('list', { name: '待办事项' })
    at openAttentionPanel (checks/lanes/attention-e2e.entry.mjs:163)
```

即：签核请求已落日志、会话已打开、待办页签点击动作执行了，但 20s 内没有出现 `aria-label="待办事项"` 的列表。

## 复现

```
source run/env.sh && node checks/lanes/attention-e2e.entry.mjs
```
（真模型 + 真浏览器；门A PASS 后必现。）

## 已排除

- **语言**：门A 之前的所有英文可访问名已改双语正则并通过（BUG-287）。
- **签核未发生**：门A 断言 `approval/asked` 已落日志，PASS。
- **会话未打开**：`openSessionBySearch` 已返回（打印 `session opened`）。

## 根因与证据

`待办` 的「等人」条目**只来自本页在线期间观察到的请求**，历史里已挂起的审批无法重建：

1. `client/wiring/attention-observers.ts:39` 注册 `approval/request`、`:27` 注册 `user-questions/request`，都是**活体 waterfall 拦截**——只有本页在场、由本页中介的那次请求才会 `attention.begin(...)` 进内存登记处（`attention-registry.ts:8` 的 Map，随页面生命周期存亡）。
2. `lib/presence/attention.ts:90 streamAttention()` 从事件流重放的**只有**升级消息与 `present` 完成事件；**不重建** `approval/asked`、`user-questions/asked` 这类"仍在等人"的历史条目。
3. `AttentionTab.tsx:136-141`：`waiting.length === 0` 时渲染 `attention.emptyWaiting`（文案 =「没有等你的事——各角色都在正常推进。」），**不渲染** `ul[aria-label=待办事项]`。

于是 lane 的时序（先跑 CFO 会话产生 `approval/asked`，再开浏览器看面板）必然得到空态；用户侧等价场景 = **刷新页面 / 关掉再开 / 另一个人打开同一个盘**——已挂起的审批都会"消失"，而空态还宣称"没有等你的事"。

## 失败类与同类排查

**失败类 = 只覆盖在线期间的活体事件，历史可重建的事实没重建（空态撒谎）。**
同类：`presence.emptyActivity` 的文案是「暂无动态（**打开期间的变化会出现在这里**）」，明说了 live-only 范围；`attention.emptyWaiting` 没有这层限定，属于同族问题的第二处（文案与数据范围不一致）。

## 已修判定

二选一（先定政策再动手，别两面都改）：

- **A 补历史重建（推荐）**：`streamAttention` 之外再给一个「pending」重建器——扫会话事件里 `approval/asked` / `user-questions/asked` 且**没有**对应 `decided`/`answered` 的条目，并入 `mergeAttention`；空态文案保持"没有等你的事"；
- **B 明确 live-only**：`attention.emptyWaiting` 改成与 `presence.emptyActivity` 同款的限定语（如「打开期间挂起的会出现在这里」），并在文档/页签描述里声明范围，同时把 attention-e2e 改成"先开浏览器再触发签核"。

判据：lane 在**当前时序**下（先签核、后开页）也能通过（A），或 lane 改序后通过且文案不再宣称全局空（B）。

## 已做的第一步（2026-11-21，未结案）

按 A 的一半落地：`lib/presence/attention.ts` 新增 `pendingApprovals()`（配对 `approval/asked` / `approval/decided`，
只留"问了没答"），`mergeAttention` 对活体与重建条目按 kind+jumpTo+what 去重，`AttentionTab` 合并两源；
keyless 13/13 通过，构建产物 `lib/client.js` 已含新代码。

**但 attention-e2e 仍红在同一断言**——所以根因不是"没人重建"，而是更靠下的一层：
要么 `session/follow` 的 frame 不带 `approval/asked`，要么页签绑定的 sessionId 与签核会话不是同一个
（lane 的 CFO 会话 cwd 在 rehearsal workspace，而观察窗登记的 workspace 未必是它）。下一步必须
直接在页面里 dump `events` 与 `waiting`，而不是继续猜；在那之前本卡保持 `修复就绪`。

## 顺带修车道（不与上面混）

无论选 A 还是 B，`attention-e2e` 的浏览器应在签核**之前**打开——否则永久测不到 live 路径；这条属车道时序问题，单独改。

## 2026-11-21 补充取证（不跑真模型也能定的两件事）

1. **`approval/asked` 确实落盘、形状与重建器期望一致**：dev home 的两份会话日志里都有该事件，实测原样：
   `{"type":"approval/asked","seq":30,"time":1791628355046,"data":{"id":"486b59…","toolName":"bash","callId":"…","reason":"escalate sandbox to danger-full-access: …"}}`
   ⇒ `pendingApprovals()` 的配对（`asked` 收、`decided` 删）在形状上是对的；lane 仍红的差异只能来自
   **喂进去的 events 不是那个会话的**（作用域），或 **history 帧不含该事件**（窗口）。
2. **vendor 没有「全局挂起审批」的查询面**：`vendor/dsh/packages/client/ui-approval` 只有活体 waterfall +
   per-session `PendingApproval`，没有 list/pending RPC。⇒ 想重建历史挂起项，只能自己走会话日志
   （`session/follow` 的 history 帧），没有更便宜的宿主查询。

## 下一步（政策 A 的最小正确形态，待落）

- **一次性 history 重建，不开 N 条长连接**：按当前 workspace 的 root 会话（cap 20，最近在前）各取
  `session/follow` 的**首个 history 帧**即中止，喂给同一个 `pendingApprovals()` 重建器，与活体登记
  （`attentionRegistry`，页面在场期全局）合并进 `mergeAttention`。
- 为什么这样够：活体面本来就是**全局**的（waterfall 拦的是整页所有会话），缺的只有「页面不在场时
  已经挂起的」这一半；history 重建补上这一半，刷新/后开就能看到。
- 判据：keyless = 两条 history fixture（一条待批、一条已 decided）→ 只出待批那条；真验收 =
  `node checks/lanes/attention-e2e.entry.mjs` 在**先签核、后开页**的时序下真绿（不放宽断言）。
- 风险：一次重建要读 ≤20 份会话日志首页——只在面板打开/刷新时触发，不进轮询。

## 2026-11-21 第二批实跑取证（instrumentation，已撤）——**lane 红的主因是环境，不是面板**

在 `AttentionTab` 里加临时诊断（每个候选会话的 history 事件计数 + 当前会话事件类型直方图），
配合 lane 的 `page.on('console')`，跑了两轮 `attention-e2e`。实测：

1. **页签绑定的是对的会话**：`sid` = 本轮 lane 建的 CFO 会话（`session-f6ad27ac…`），`leadId` 相同，
   `cwd` = `runtime/rehearsal-workspace`。卡上「页签 sessionId 与签核会话不是同一个」这一支**被证伪**。
2. **该会话的 history 里 asked 与 decided 同时在场**：
   `{"type":"approval/asked","seq":70,"time":1795237352162,"data":{"id":"26504d7c…","toolName":"request_signoff",…}}`
   `{"type":"approval/decided","seq":71,"time":1795237352162,"data":{"id":"26504d7c…","outcome":"rejected"}}`
   —— **同一毫秒**，`outcome=rejected`。没有人在场，是策略自动拒的（同会话 seq 2 有
   `{"type":"approval/policy","data":{"policy":"never"}}`）。
3. 追到根：`run/env.sh` 在本机导出 `DSH_PERMISSION_MODE=danger-full-access`（`sandbox-exec` 被系统禁掉），
   该模式**同时把审批策略推成 `never`**（env.sh 第 34 行原话）。⇒ 本机上**不存在「等人批」的挂起审批**，
   面板显示空是**正确**的，lane 的「批准之前断言待批」在这台机器上**不可满足**。

**因此**：`attention-e2e` 的红是**环境缺口**（policy=never），不是待办面板的缺陷；这条要与产品缺陷分开记账。
可判据的形式 = 在 `sandbox-exec` 可用的机器（approval policy = ask）上跑同一条 lane。

## 顺带证伪的修法（别按它做）

试过「按 workspace 的 root 会话各取首个 `session/follow` history 帧」来重建历史：**不成立**——
对**未打开**的会话，`session/follow` 在两轮实跑里一次 history 帧都没产出（20 个候选会话零帧，
诊断行一条没打）。要在客户端读别的会话历史，只能走 `session/page`（lane 自己就是这么轮询的），
或用宿主侧聚合查询——这已经不是「补一个重建器」的量级，属需要立项的选择。

**当前处置**：本卡留在 `调查中`（产品主张在本机不可证、且重建路径需要换数据面）；
触发句 = 「在有 `sandbox-exec` 的机器上（或显式 `approval policy = ask`）跑 `node checks/lanes/attention-e2e.entry.mjs`，
并同时验证刷新后仍能看到挂起审批」。**不翻 `已修`，也不改 lane 断言**。
