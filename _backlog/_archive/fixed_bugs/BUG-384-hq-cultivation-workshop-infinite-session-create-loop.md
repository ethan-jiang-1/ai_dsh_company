---
status: 已修
severity: P0
opened: 2026-11-27
---

# BUG-384：总部培养工坊点击「启动培养对话」触发无限新建会话循环且永久卡在准备中

> 严重级别：P0（阻断性功能缺陷：点击全球总部「启动培养对话」后，界面永久停留在「正在准备独立培养会话…」，同时在后台以每秒数个的速度无限创建空白 `company-workspace` 会话——实测 5 秒内膨胀出 29–41 条垃圾会话，`composers=0`）｜发现：2026-11-27｜状态：已修｜审查：agent（`7ad5c423` 独立只读盲审通过，0 阻断）
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：HQ 主会话锁定与培养会话排除）

## 症状

1. 打开左侧栏「梦之队总部」（HQ）→ 切到「培养工坊」分区；
2. 点击右侧的「启动培养对话」按钮；
3. 右栏一直卡在 `"正在准备独立培养会话…"`，始终不挂载原生对话输入框（`composers=0`）；
4. 切回「总部总览」，「公司会话」列表在几秒内多出数十条新空白 `company-workspace` 会话（实测 5s 后总数分别达到 `rows=29` 和 `rows=41`）。

## 运行面

- **面 = client**：[company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx)（`HqCultivationWorkshop` 的 `useEffect` 与 `started` 状态、`CompanyHqPage` 的 `pickPrimarySession` 与已知培养会话集合）。

## 复现

```sh
pnpm test tests/client/ux/company-hq.spec.ts
```

真浏览器原发现命令：`source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs`（实测 `[FAIL] C3_hq_embedded_cultivation_chat — composers=0 state="正在准备独立培养会话…"`，5s 内会话数膨胀至 29）。

## 根因与证据

1. `CompanyHqPage`（[company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx)）原通过 `primarySession = sessionList[0]` 计算 `mainSessionId`，而 `sessionSummaryList` 按 `(right.updatedAt ?? 0) - (left.updatedAt ?? 0)` 降序排列所有非 `subagent` 会话。
2. 点击「启动培养对话」将 `HqCultivationWorkshop` 的局部 `started` 置为 `true`（此状态随组件实例常驻，不随 `mainSessionId` 复位）。
3. `useEffect` 执行 `sessions.create({ cwd, agentPreset })` 创建一个顶层（无 `origin: 'subagent'`）会话 `S_new`。
4. 新会话进入 `sessions` store 且 `updatedAt` 最新，立刻成为 `sessionList[0]`（`primarySession`），导致传入 `HqCultivationWorkshop` 的 `mainSessionId` prop 从 `S_0` 变成 `S_new`。
5. `mainSessionId` 变化触发上一次 `useEffect` 的 cleanup（`cancelled = true`，`reference?.release()`），并立即对新 `mainSessionId = S_new` 重跑 `useEffect`；此时 `shouldConnect` 仍为 `true` 且 `localStorage` 里 `S_new` 没有绑定键，于是再次调用 `sessions.create(...)`——形成无限雪崩循环。

## 失败类与同类排查

- **失败类**：副作用创建新记录反推改写自身依赖键导致自激循环。
- **同类排查**：`CultivationTab`（右栏侧栏会话级 `sessionId`）与 `CultivationView`（会话内主视图 `sessionId`）均接收固定会话级 `sessionId` prop，不经 `sessionList[0]` 派生，不存在同类反跳路径。

## 已修判定

- 「启动培养对话」绑定到锚定的主会话 `S_0`（排除 `localStorage` `dsh-company-hq-cultivation:*` 与内存已建培养会话集合，优先 `mainView` 与 `pinnedSessionIdRef`）；
- 新建培养会话 `S_new` 在 `sessions.list` 排序跃居首位时，点击一次只创建 1 个培养会话并稳定停留在 `ready` 态渲染内嵌 Composer。

## 修复证据

- 改动面：`packages/company-pack/src/client/ux/company-hq.tsx`、`tests/client/ux/company-hq.spec.ts`
- 红：`pnpm test tests/client/ux/company-hq.spec.ts` —— 修复前 1 failed（`BUG-384` 用例 `create` 被调用 6 次而非 1 次）
- 绿：`pnpm test tests/client/ux/company-hq.spec.ts` —— 7/7 passed（`create` 严格调用 1 次且稳定渲染内嵌对话槽）
- 提交：commit 4711f9d3
