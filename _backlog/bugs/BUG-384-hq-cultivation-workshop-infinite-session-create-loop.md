---
status: 调查中
severity: P0
opened: 2026-11-27
---

# BUG-384：总部培养工坊点击「启动培养对话」触发无限新建会话循环且永久卡在准备中

> 严重级别：P0（阻断性功能缺陷：点击全球总部「启动培养对话」后，界面永久停留在「正在准备独立培养会话…」，同时在后台以每秒数个的速度无限创建空白 `company-workspace` 会话——实测 5 秒内膨胀出 29–41 条垃圾会话，`composers=0`）｜发现：2026-11-27｜状态：调查中

## 症状

1. 打开左侧栏「梦之队总部」（HQ）→ 切到「培养工坊」分区；
2. 点击右侧的「启动培养对话」按钮；
3. 右栏一直卡在 `"正在准备独立培养会话…"`，始终不挂载原生对话输入框（`composers=0`）；
4. 切回「总部总览」，「公司会话」列表在几秒内多出数十条新空白 `company-workspace` 会话（实测 5s 后总数分别达到 `rows=29` 和 `rows=41`）。

## 运行面

- **面 = client**：[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx#L221-L280)（`HqCultivationWorkshop` 的 `useEffect` 与 `started` 状态）、[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx#L367-L373) 与 [第 505-510 行](../../packages/company-pack/src/client/ux/company-hq.tsx#L505-L510)（`CompanyHqPage` 把按 `updatedAt` 倒序取首位的 `primarySession?.id` 当作 `mainSessionId` 喂给工坊）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测输出：
- `[FAIL] C3_hq_embedded_cultivation_chat — composers=0 state="正在准备独立培养会话…"`
- `[PASS] C2_hq_all_segments — ov=true rows=29 ledger=true strat=true`（初始仅 3 个非子代理会话，5 秒后膨胀至 29 个）。
- 现场截图：`runtime/tmp/ux-audit/out/shots/16-zh-hq-cultivation-embedded.png`、`runtime/tmp/ux-audit/out/shots/17-zh-hq-overview.png`。

## 根因与证据

1. `CompanyHqPage`（[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx#L367-L368)）通过 `primarySession = sessionList[0]` 计算 `mainSessionId`，而 `sessionSummaryList` 按 `(right.updatedAt ?? 0) - (left.updatedAt ?? 0)` 降序排列所有非 `subagent` 会话。
2. 点击「启动培养对话」将 `HqCultivationWorkshop` 的局部 `started` 置为 `true`（此状态随组件实例常驻，不随 `mainSessionId` 复位）。
3. `useEffect` 执行 `sessions.create({ cwd, agentPreset })` 创建一个顶层（无 `origin: 'subagent'`）会话 `S_new`。
4. 新会话进入 `sessions` store 且 `updatedAt` 最新，立刻成为 `sessionList[0]`（`primarySession`），导致传入 `HqCultivationWorkshop` 的 `mainSessionId` prop 从 `S_0` 变成 `S_new`。
5. `mainSessionId` 变化触发上一次 `useEffect` 的 cleanup（`cancelled = true`，`reference?.release()`），并立即对新 `mainSessionId = S_new` 重跑 `useEffect`；此时 `shouldConnect` 仍为 `true` 且 `localStorage` 里 `S_new` 没有绑定键，于是再次调用 `sessions.create(...)`——形成无限雪崩循环。

## 期望判据

- 「启动培养对话」绑定到打开总部前的固定主会话（或新建的培养会话自身标记/隔离而不反推覆盖 `mainSessionId` 依赖链）；
- 点击一次只创建 1 个培养会话并稳定停留在 `ready` 态渲染内嵌 Composer，`总部总览` 会话数仅 `+1`。
