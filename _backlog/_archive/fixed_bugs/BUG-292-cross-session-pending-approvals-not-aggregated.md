---
status: 已修
severity: P2
opened: 2026-11-21
---

# BUG-292：待办只重建「本会话」的挂起项——别人会话里等着的审批，在自己的会话里看不到

> 严重级别：P2（次要偏重：多人形态下「等你处理」会漏掉本该你批的事）｜发现：2026-11-21（BUG-288 反证时分离出来的残留）｜状态：已修｜审查：agent — 逐条核对已修判定（spec 6/6 + 真页面空态原文）
>
> **留痕**：Note [2026-11-21-diagnosable-failure-and-scope.md](../../../notes/implemented/2026-11-21-diagnosable-failure-and-scope.md)（材料性：client 公开文案，已在该 Note 的 F4 节记录）。

## 症状

会话 A 打开右栏「待办」页签；此时会话 B（同一个人另一条会话，或另一位人的会话）里有一条
`request_signoff` 待批。A 的面板显示「没有等你的事——各角色都在正常推进。」，B 的那条不出现。

另一面已被 BUG-288 的复验证实：**同一条会话**的挂起审批，后开的页面**能看到**（历史重建生效）。
所以缺口不是「历史没重建」，而是「重建只覆盖一条会话」。

## 复现

```sh
# 1) 以 ask 策略起实例（本机默认 never 会把审批同毫秒自动拒，见 BUG-288）
source run/env.sh && DSH_PERMISSION_MODE=workspace-write node tools/dev/company.mjs --home runtime/e2e-fix-home --workspace runtime/rehearsal-workspace --no-open
# 2) 用 RPC 在会话 B 造一条待批 request_signoff（<URL> 从横幅读）：
#    session/create{cwd:<repo>/runtime/rehearsal-workspace, agentPreset:'cfo'} → session/prompt 要求调 request_signoff
# 3) 浏览器打开**会话 A** → 右栏「待办」→ 观测：没有「待批审批 B」这一行
```

## 根因与证据

- `packages/company-pack/src/client/tabs/AttentionTab.tsx` 的重建只喂当前会话：
  `pendingApprovals(events, leadId)`，`events` 来自 `props.follow(props.sessionId, …)`。
- 活体登记处（`wiring/attention-observers.ts`）只登记**本页在场期间**拦到的 `approval/request`，
  另一个人/另一个浏览器里发起的请求不会经过它。
- 「读别人会话的历史」没有现成通路：两轮实跑证实 **`session/follow` 对未打开的会话零 history 帧**
  （20 个候选会话、诊断行一条没打）；vendor 的 `ui-approval` 只有活体 waterfall + per-session
  `PendingApproval`，**没有全局待批查询面**。
- 裁决证据与 `approval/asked` 原始事件抄在 [BUG-288](../settled_issues/BUG-288-attention-panel-list-missing.md) 的「撤回」节。

## 失败类与同类排查

**失败类 = 投影的作用域小于它呈现的语义**（F4 的另一半）：面板叫「待办/等你处理」，语义是公司级，
但数据只来自一条会话。同类：`presence` 动态流同样只覆盖当前会话（`streamAttention(events, leadId)`）。

## 待定（需要拍板，不是我能自授权）

修法有真实取舍，且都动到公开行为：

- **A 宿主聚合查询**：新增一个「当前工作区的挂起审批」查询面（host 侧扫会话日志）——
  最干净、一次往返，但要新增 API（材料性，需立项）。
- **B 客户端按需读**：对同工作区 root 会话逐个 `session/page` 取首页（cap 20）——不新增 API，
  但每次开面板多 N 次往返，且要处理分页/失败降级。
- **C 只在文案上诚实**：把「等你处理」改成「本会话等你处理」——最便宜，但多人形态的产品承诺缩水。

**不在本卡范围**：BUG-288 的同会话历史重建（已验证可用，保留）。

## 修法选型（2026-11-21，含被结构挡死的那条）

- **B 客户端按需读**：**结构上不可行**。`sessions.retain()` 的 `source` 是 vendor 的封闭联合
  （`SessionReferenceSource = controllerOperation | gateway | …`），本包不能自造 source；
  而 `session/follow` 对**未打开**的会话零 history 帧（两轮实跑）。⇒ 客户端没有「打开别人的会话」的正路。
- **A 宿主聚合查询**：本包目前**一个 `@Remote` 都没有**（`src/host/` 全是 commands/tools），新增查询面
  等于给插件引入一套远程 API（材料性、需立项），不在本轮量级。
- **C 文案诚实**（本轮采用）：面板按会话呈现是既成事实，就把这条边界写在空态里——
  不再让「没有等你的事」被读成「公司里没人等你」。

## 已修判定

- 待办空态必须声明作用域：**本会话**的挂起项都在这里；别的会话里等着的审批要打开那个会话才看得到。
- 判据命令：`vitest run tests/client/tabs/attention-tab.spec.ts`（新增一条钉这两句话）+ 真页面点「待办」看到原文。
- 不在本卡范围：跨会话聚合本身（A 路线，需立项）。

## 修复证据

- 改动面：`packages/company-pack/src/client/locales.ts`、`tests/client/tabs/attention-tab.spec.ts`
- 红：`vitest run tests/client/tabs/attention-tab.spec.ts` —— 撤掉 locales 的文案改动后 1 failed / 5 passed（空态不含作用域句）
- 绿：`vitest run tests/client/tabs/attention-tab.spec.ts` —— 6/6 通过；真页面（隔离 home 落地页点「待办」）实际渲染「没有等你的事——本会话的挂起项都在这里；别的会话里等着的审批，要打开那个会话才看得到。」
- 提交：commit 8edca3ab
