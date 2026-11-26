状态：implemented（2026-11-27）；批准：用户 2026-11-27 指令「系统性组织并全部修复 _backlog/bugs」｜上游 = [BUG-384](../../_backlog/_archive/fixed_bugs/BUG-384-hq-cultivation-workshop-infinite-session-create-loop.md)、[BUG-385](../../_backlog/_archive/fixed_bugs/BUG-385-hq-cultivation-board-ignores-locale-stays-chinese-in-en.md)、[BUG-386](../../_backlog/_archive/fixed_bugs/BUG-386-inline-controls-and-presence-aside-wrap-vertical-crushed.md)、[BUG-387](../../_backlog/_archive/fixed_bugs/BUG-387-mobile-390-hq-cultivation-overflow-and-rightbar-occlusion.md)、[BUG-388](../../_backlog/_archive/fixed_bugs/BUG-388-attention-live-approval-duplicate-and-boundary-blank-void.md)

# BUG-384..391 批次收口：HQ 状态锁定、响应式护栏、跨源审批去重与表达层收口

## 决定

1. **HQ 主会话锁定与培养语言显式同步（[BUG-384](../../_backlog/_archive/fixed_bugs/BUG-384-hq-cultivation-workshop-infinite-session-create-loop.md) / [BUG-385](../../_backlog/_archive/fixed_bugs/BUG-385-hq-cultivation-board-ignores-locale-stays-chinese-in-en.md)）**：
   - `CompanyHqPage` 通过 `readKnownCultivationIds`（扫描 `localStorage` `dsh-company-hq-cultivation:*` 前缀并合并内存 `createdCultivationIdsRef`）排除已知培养会话，并由 `pickPrimarySession` 优先选 `mainView` 会话、其次保持已锚定的 `pinnedSessionIdRef`，确保新建培养会话即使以最新 `updatedAt` 排到 `sessions` 首位也绝不反推覆盖 `mainSessionId`；`HqCultivationWorkshop` 创建会话后立刻回调 `onCultivationSessionCreated` 并写入 `storageKey`，且对已知培养会话直接 `open` 不再套娃创建；
   - `CultivationBoardProps` 新增可选 `language?: 'zh' | 'en'` prop，并在 `CultivationBoard` 入口同步 `setCultivationLanguage(language)`，`HqCultivationWorkshop`、`CultivationTab`、`CultivationView` 三处宿主统一透传，消除“直开 HQ 培养工坊时模块语言未切换导致整块面板滞留中文”的隐式耦合。
2. **内嵌不换行护栏、在场列对齐与窄屏 HQ/全屏右栏出口（[BUG-386](../../_backlog/_archive/fixed_bugs/BUG-386-inline-controls-and-presence-aside-wrap-vertical-crushed.md) / [BUG-387](../../_backlog/_archive/fixed_bugs/BUG-387-mobile-390-hq-cultivation-overflow-and-rightbar-occlusion.md)）**：
   - `styles.ts` 给 5 处内嵌 slot 包装类及其按钮/胶囊统一加 `flex-shrink: 0; white-space: nowrap`（`.wk-doc-actions` 允许整按钮 `flex-wrap: wrap` 换行而不截断单字）；`.wk-row-button` 去掉 `width: 100%` 并补 `min-width: 0`，`PresenceTab` 在开启旁路按钮时在表头、Lead 与 Teammate 行尾统一渲染 `.wk-row-aside-cell` 保持列线对齐；
   - `.wk-hq-grid` 改用 `minmax(min(100%, 300px), 1fr)` 并补 `@media (max-width: 820px)` 将 `.wk-hq-cultivation-split` 折叠为单列；因上游 `vendor/dsh` `SidebarRight` 在 `<768px` 自动切入 `fullscreen: true`，公司侧三大聚合 Hub（`OpsHubTab`/`TeamHubTab`/`ArchiveHubTab`）在 `fullscreen` 下隐藏无效双分屏按钮并提供 `[data-company-narrow-close]`「收起侧栏」出口，同时 `openSplitPreset` 在 `<768px` 跳过 `preferNewPane: true`。
3. **跨源无 id 审批去重与有界空态占位（[BUG-388](../../_backlog/_archive/fixed_bugs/BUG-388-attention-live-approval-duplicate-and-boundary-blank-void.md)）**：
   - `AttentionItem`、`LivePending`、`approvalFromPayload`、`pendingApprovals` 与 `registerAttentionObservers` 透传 `callId`（不伪造 `id`），`mergeAttention()` 对活体审批优先按 `(jumpTo, callId)` 精确去重，对既无 `id` 又无 `callId` 的兜底活体审批按内容 1:1 预算抵消，避免同摘要不同 `callId` 被塌缩；
   - `AttentionTab` 在 `waiting.length === 0 && hasBoundary(boundaries)` 时不再返回 `null` 留白，改为渲染 `[data-attention-empty-bounded]`（`attention.emptyWaitingBounded`）以诚实交代扫描边界。

## 输掉的方案

- **只靠 `origin` 或会话标题过滤培养会话（384）**：DSH `sessions.create({ cwd, agentPreset })` 创建的是常规顶层会话，没有独立 `origin: 'cultivation'` 字段，且会话标题可随首条消息或用户改名变化；基于 `localStorage` 前缀键集合 + 内存创建登记表 + `pinnedSessionIdRef` 锚定才与平台 `sessions` 契约一致且不碰 `vendor/dsh/`。
- **只在 `HqCultivationWorkshop` 补一行 `setCultivationLanguage()` 而不改 `CultivationBoard`（385）**：三处宿主各自维护一行副作用调用容易在新容器上线时再次漏掉；在 `CultivationBoard` 加显式 `language` prop 并在三处宿主同步透传，既保持向后兼容，又把语言同步收敛到共享组件边界。
- **在公司 CSS 用 `!important` 强改上游 `AppFrame` 右栏定位（387）**：上游 `<768px` 右栏全屏由 `SidebarRight.tsx:360` 控制并遵循原生 `AppFrame` 列计算；在公司聚合 Hub 顶栏于 `fullscreen=true` 提供明确「收起侧栏」按键并在窄屏禁开双分屏，不触碰 `vendor/dsh/` 也不引入跨包 CSS 脆债。
- **给 `approval/request` 活体项伪造 `id = callId` 或继续按摘要全量去重（388）**：既会破坏 `attention-observers.spec.ts` 中「无 `id` 时 `LivePending.id === undefined`」契约，也会在无 `callId` 时吞掉同摘要的两条独立审批；透传 `callId` 并在 `mergeAttention` 分级去重（`id` → `callId` → 1:1 内容配额）可同时保住身份边界与零重复。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| HQ 主会话锚定与培养会话排除 | [`pickPrimarySession`](../../packages/company-pack/src/client/ux/company-hq.tsx) | `CompanyHqPage` 读取、`onCultivationSessionCreated` + `dsh-company-hq-cultivation:*` 写入 |
| 培养板语言同步 | [`CultivationBoard`](../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx) | `HqCultivationWorkshop` / `CultivationTab` / `CultivationView` 透传 `language` |
| 内嵌控件不换行与 HQ 窄屏单列 | [`styles.ts`](../../packages/company-pack/src/client/ui/styles.ts) | `client-css.spec.ts` 守卫；`PresenceTab` 消费 `.wk-row-aside-cell` |
| 全屏右栏收起出口 | [`useSidebarFullscreen`](../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx) | `OpsHubTab` / `TeamHubTab` / `ArchiveHubTab` 渲染 `[data-company-narrow-close]` |
| 跨源审批 `callId` 去重与边界空态 | [`mergeAttention`](../../packages/company-pack/src/lib/presence/attention.ts) | `attention-observers.ts` 写入 `callId`；`AttentionTab` 消费 `hasBoundary` 渲染 `[data-attention-empty-bounded]` |

## 验证（真跑过）

- **组 1（384/385）**：`pnpm test tests/client/ux/company-hq.spec.ts` —— 还原 `pickPrimarySession` 与 `language` 同步前 2 failed（`create` 被调用 6 次陷入死循环；en 界面仍输出「我的分身」）；修复后 7/7 passed，联动 `pnpm test tests/client/cultivation/` 184/184 passed、`pnpm typecheck` 与 `pnpm lint`（`company-static-audit: scanned=160 violations=0`）全绿。
- **组 2（386/387）**：`pnpm test tests/client/ui/client-css.spec.ts tests/client/tabs/company-tabs-body.spec.ts tests/client/ux/company-hub-tabs.spec.ts tests/client/ux/company-triggers-shortcuts.spec.ts` —— 还原前 4 failed（缺 nowrap/min-width、缺 `.wk-row-aside-cell`、缺 `<= 820px` 单列折叠、缺 `[data-company-narrow-close]`）；修复后 13 个测试文件 58/58 passed（含 `tests/client/i18n/`），`pnpm typecheck` 与 `pnpm lint` 全绿。
- **组 3（388）**：`pnpm test tests/client/wiring/attention.spec.ts tests/client/presence/attention-parity.property.spec.ts tests/client/tabs/attention-tab.spec.ts` —— 还原前 5 failed（live+history `callId` 重复叠成 2 条；无 `callId` 内容配额未抵消；`[data-attention-empty-bounded]` 为 null）；修复后联动 `attention-observers.spec.ts` 与 `i18n/attention-tab.spec.ts` 共 5 文件 96/96 passed，`pnpm typecheck` 与 `pnpm lint`（`company-static-audit: scanned=160 violations=0`）全绿。

## 未覆盖轴

- [covered] HQ 培养创建防反跳（模拟新会话 `updatedAt` 跃居首位）、英文直开 HQ 培养板零 CJK、CSS 不换行/响应式断点、在场对齐与全屏收起出口、跨源审批 `callId`/配额 1:1 去重与边界空态占位 → 去向：[company-hq.spec.ts](../../tests/client/ux/company-hq.spec.ts) / [client-css.spec.ts](../../tests/client/ui/client-css.spec.ts) / [company-hub-tabs.spec.ts](../../tests/client/ux/company-hub-tabs.spec.ts) / [attention.spec.ts](../../tests/client/wiring/attention.spec.ts) / [attention-tab.spec.ts](../../tests/client/tabs/attention-tab.spec.ts)
- [policy] `<768px` 右栏展开时自动切入全屏遮挡左侧栏属上游 `vendor/dsh` `SidebarRight.tsx` 设计约束，公司侧不改 `vendor/`，改为在全屏 Hub 提供显式「收起侧栏」出口 → 去向：[SidebarRight.tsx](../../vendor/dsh/packages/client/ui-sidebar-right/src/client/shell/SidebarRight.tsx)
- [environment-gap] 真 Chromium 与真实 `company` profile 挂载下的 HQ 培养工坊与窄屏 390px 复测将在本批次收口阶段统一重建 `lib/client.js` 并运行 `ui-scene` / `client-load` / `phase2-audit` → 去向：[client-load.entry.mjs](../../checks/lanes/client-load.entry.mjs)
