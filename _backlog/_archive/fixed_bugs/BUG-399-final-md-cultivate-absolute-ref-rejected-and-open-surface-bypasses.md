---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-399：`final.md` 发起复盘培养传入绝对路径导致提交必被拒，且多处 `openTab` 入口绕过 HQ 切回守卫并错抢意图队列

> 严重级别：P1（功能闭环断链：`BUG-398` 打通的「`final.md` → 发起复盘培养」表单一提交即报错拒收；`CompanyTurnTailCard` / `StrategyButton` / `openCompanyOverview` / `TasksAction` 未接 `openOnSessionSurface` 并在无会话表面时直抛错、全局快捷键静默丢单，且 `openDeliverables` 预判成功 Toast、双挂载表单抢消费）｜发现：2026-11-27｜状态：已修｜审查：独立只读盲审通过（0 阻断）；去向 = [批次Note](../../../notes/implemented/2026-11-27-ux-ui-round3-batch-fixes.md)
>
> **留痕**：commit `dd20d299`（批次 399..405 顺位 1：扩展 `deliverables-archive` 归一与触发、统一全部 `openTab`/快捷键至 `openOnSessionSurface`、延后 `reviewOpened` 到 `onSuccess`、`composeIntentStore` 增加 `target` 作用域）

## 症状

1. **`final.md` →「发起复盘培养」提交必被拦截拒收**（Phase 1 集成复现 `P1` 通过）：在右栏预览任意终稿 `final.md` 时，点击「发起复盘培养」（`DeliverableFinalDocActions`）把上游提供的**绝对路径**（`absolutePath`）写入 `composeIntentStore`；`CultivationCompose` 展开并预填该 `filePath` 为 `context.ref`，填好「期望做法」与「做法」点击「记下来」时，被 `encodeContextToken` 内的路径校验直接拒收并报错：**`成品 ref 必须是安全的工作区相对路径`**（Host 侧 `readDeliverableContext` 同样只按相对 `entry.path` 精确匹配）；
2. **其余 5 处右栏跳转入口 + 快捷键仍绕过 `openOnSessionSurface`**：[registerWaveS4Ux](../../../packages/company-pack/src/client/ux/register-s4-ux.ts#L36-L43)（`CompanyTurnTailCard` `openOps` / `openArchive`）、[client/index.ts](../../../packages/company-pack/src/client/index.ts#L227-L230)（`StrategyButton` `open`）、[client/index.ts](../../../packages/company-pack/src/client/index.ts#L258-L261)（`openCompanyOverview`）与 [client/index.ts](../../../packages/company-pack/src/client/index.ts#L427-L430)（`TasksAction` `openTasks`）仍直接调用 `sidebarRight.openTab(...)`，当主区在 HQ 等非会话面板或未挂载右栏表面时直接抛出 `sidebarRight: no session surface is mounted`（Phase 1 `P3-A` 实测抛错复现）；此外 [company-triggers-shortcuts.ts](../../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts#L140) 的 `safeOpenHubFromShortcut` 也未接入 `openOnSessionSurface`，在 `mounted.getSnapshot() === undefined` 时提前 `return` 导致快捷键静默失效（不抛错但无响应）；
3. **`openDeliverables` 异步前预判成功 Toast & 双挂载 `composeIntentStore` 竞争消费**：[register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L177-L181) 在 `safeOpenTab('company-deliverables')` 异步 `openOnSessionSurface` 完成（或超时失败）前即弹出 `toast.reviewOpened` 成功提示；且当右栏 `CultivationTab` 与 HQ `CompanyHqPage` 同时挂载 `CultivationCompose` 时，先触发订阅者立即 `consume(intent.id)` 导致后一个挂载视图收不到任何预填意图（Phase 1 `P3-B` 实测复现）。

## 运行面

- **面 = client / lib**：
  - [contextual-actions.tsx](../../../packages/company-pack/src/client/ux/contextual-actions.tsx#L76-L81)、[CultivationCompose.tsx](../../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx#L122-L156)、[cultivation-context.ts](../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L128-L149)、[cultivation-context-read.ts](../../../packages/company-pack/src/host/cultivation/cultivation-context-read.ts#L124-L125)；
  - [register-s4-ux.ts](../../../packages/company-pack/src/client/ux/register-s4-ux.ts#L36-L43)、[index.ts](../../../packages/company-pack/src/client/index.ts#L227-L230)、[company-triggers-shortcuts.ts](../../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts#L140)、[register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L177-L181)。

## 复现

```sh
npx vitest run --config runtime/tmp/ux-audit-r3/vitest.tmp.config.ts
```

- `P1: DeliverableFinalDocActions -> composeIntentStore -> CultivationCompose passes absolutePath and fails isSafeContextRef`: 传递 `<workspace>/.dsh-company/deliverables/2026-11-27-m1/final.md`，提交时 `run` 未调用，容器抛出 `'成品 ref 必须是安全的工作区相对路径'`；
- `P3-A`: HQ / 无会话表面态调 `openOps()` / `openArchive()` 直接抛出 `'sidebarRight: no session surface is mounted'`；
- `P3-B`: 同时挂载两个 `CultivationCompose`，仅 1 处表单展开消费 `composeIntentStore`，另一处丢失。

## 根因与证据

1. `BUG-398` 将 `TextPreview` 给出的 `absolutePath` 直接透传至 `composeIntentStore` 并塞入 `context.ref`，而 [isSafeRelativePath](../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts#L128-L133) 严格拒绝前导 `/` 或盘符的绝对路径，且未在客户端把 `.dsh-company/(deliverables|deliverables-archive)/<dir>/final.md` 归一化为工作区相对路径；
2. `BUG-393` 抽出了 [openOnSessionSurface](../../../packages/company-pack/src/client/wiring/sidebar-right-guard.ts#L26-L64)，但仅接入了 `safeOpenTab`、`openContext` 与 `openFinal`，其余 5 处 `openTab` 与快捷键入口遗漏未迁移；`openDeliverables` 在调用异步 `safeOpenTab` 后同步触发成功 Toast。

## 失败类与同类排查

- **失败类**：跨协议边界（上游 `absolutePath` vs 公司相对 `deliverable` ref）未做入口归一化；异步表面切换守卫（`openOnSessionSurface`）与意图消费机制局部补接漏掉同胞调用点。

## 修复证据

- 改动面：`packages/company-pack/src/client/tabs/deliverables-focus-store.ts`、`packages/company-pack/src/client/ux/contextual-actions.tsx`、`packages/company-pack/src/client/wiring/sidebar-right-guard.ts`、`packages/company-pack/src/client/ux/register-s1-ux.ts`、`packages/company-pack/src/client/ux/register-s2-ux.ts`、`packages/company-pack/src/client/ux/register-s4-ux.ts`、`packages/company-pack/src/client/ux/company-triggers-shortcuts.ts`、`packages/company-pack/src/client/index.ts`、`packages/company-pack/src/client/cultivation/compose-intent-store.ts`、`packages/company-pack/src/client/cultivation/CultivationCompose.tsx`、`packages/company-pack/src/client/cultivation/CultivationBoard.tsx`、`packages/company-pack/src/client/tabs/CultivationTab.tsx`、`packages/company-pack/src/client/ux/company-hq.tsx`。
- 红：无 `deliverables-archive` 归一时执行 `pnpm test tests/client/tabs/deliverables-tab-states.spec.ts` 提交报「成品 ref 必须是安全的工作区相对路径」；`mounted=undefined` 时执行 `pnpm test tests/client/ux/company-hq.spec.ts` `openOps`/`openArchive`/`Alt+Shift+3` 抛 `no session surface is mounted` 或静默丢单；双挂载时侧栏抢消费 HQ 意图。
- 绿：`pnpm test tests/client/ux/company-hq.spec.ts` 与 `pnpm test tests/client/tabs/deliverables-tab-states.spec.ts` 与 `pnpm test tests/client/ux/company-turn-tail.spec.ts` 与 `pnpm test tests/client/ux/company-triggers-shortcuts.spec.ts` 与 `pnpm test tests/client/company-client-composition.spec.ts`（7 份 spec 45/45 绿），且 `pnpm typecheck`、`pnpm lint`、`pnpm dup` 零错误零违例。
- 提交：commit dd20d299
