---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-400：HQ 内嵌工坊仍泄漏 `ComposerStatusPill`、`HeroMotionOptions` 无角色守卫，且培养看板加载空窗/撤回取消/选择器 Reject/后台监听存在竞态与卡死

> 严重级别：P1（多处 UX 破坏与异步死锁：`ComposerStatusPill` 在工坊内显示一点即踢出 HQ；`HeroMotionOptions` 在普通非公司会话曝光；`CultivationContextPicker` `listDeliverables` reject 时永久卡死「正在读取」；`CultivationAdopted` 读中空白与撤回取消未禁用、`CultivationFeedback` 首连误报不可达、`visibilitychange` 后台发读风暴）｜发现：2026-11-27｜状态：已修（`cc9da514`）｜审查：待盲审确认

## 症状

1. **HQ 工坊与非公司会话 Chrome 守卫漏口**（Phase 1 `P4-A`、`P4-B` 实证复现）：
   - [ComposerStatusPill](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L198-L209)（`conversation.composer.dock`）缺少 `isEmbeddedWorkshopSession(sessionId)` 守卫，导致 HQ 内嵌工坊会话底部仍挂载公司状态胶囊（且点击调用 `openTab` 会退出 HQ 面板）；
   - [HeroMotionOptions](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L105-L127)（`conversation.hero.options`）仅检查 `!isEmbeddedWorkshopSession(sessionId)` 而未检查 `readCompanyRole`，会在无角色普通 DSH 新会话渲染「快速发起：撰写 PRD / 审稿 / 立项简报」；
   - （源码伴随）`workshop-sessions.ts` 使用非响应式模块 `Set` 且在 `CompanyHqPage` 的 `useEffect`（渲染后）才调用 `registerEmbeddedWorkshopSession`，导致内嵌会话首帧挂载时 Chrome 仍会渲染后才销毁闪跳；环境角标在存在历史重建审批时只读 `useAttentionItems` 实时项而在刷新后于 `0` 处报「无待办 / 就绪」。
2. **培养看板读取空白、撤回取消未禁用与赞踩首连误 flash**（Phase 1 `Q1-A`、`Q2-C` 实证复现）：
   - [CultivationAdopted](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L129-L133) 在 `records === null`（尚未读完）时既不显示空态也不显示加载中，仅渲染孤立标题下空白区域；
   - 同一面板点击「撤回…」→「确认撤回」处于 `pendingIds.has(record.id)` 期间，「确认撤回」已禁用，但紧邻的 **`取消` 按钮未设置 `disabled={pendingIds.has(record.id)}`**，操作中可被点击关闭确认态；同时 `verifyingId` 与 `revokingSlug` 相互独立，同一记录可同时展开两套操作表单；
   - [CultivationFeedback](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L313-L319) 将 `feedback === null`（初始化读取未收到首帧）与 `!reachable` 合并渲染同一文案，导致 `reachable={true}` 时首帧仍渲染 **`人的赞/踩（本会话）事件流不可达——赞/踩块降级`**。
3. **培养背景选择器 Reject 永驻加载与切走页面后台读风暴**（Phase 1 `Q2-A`、`Q2-B` 实证复现）：
   - [CultivationContextPicker](../../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx#L65-L78) 调用 `props.sources.listDeliverables(...).then(...)` 缺 `.catch()`，Promise rejected 时产生未捕获拒绝异常且 `loading` 永远保持 `true`（永久卡在「正在读取这段背景…」）；
   - [useCultivationPanelData](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L348-L358) 在 `document` 上监听 `visibilitychange` 调 `wake()` 时不检查 `document.visibilityState === 'visible'`，用户在浏览器切走标签页（`hidden`）时仍触发整套 6 角色 journal + records 读取链路。

## 运行面

- **面 = client**：
  - [ambient-chrome.tsx](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L105-L220)、[workshop-sessions.ts](../../../packages/company-pack/src/client/ux/workshop-sessions.ts)；
  - [CultivationBoardSections.tsx](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L129-L134,L242-L259,L313-L319)；
  - [CultivationContextPicker.tsx](../../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx#L65-L78)、[cultivation-data.ts](../../../packages/company-pack/src/client/cultivation/cultivation-data.ts#L348-L358)。

## 复现

```sh
npx vitest run --config runtime/tmp/ux-audit-r3/vitest.tmp.config.ts
```

- `P4-A`：注册 `workshop-r3-1` 后渲染 `ComposerStatusPill`，`[data-company-composer-dock]` 仍挂载存在；
- `P4-B`：`sessionId='plain-sess-1'`（无 `agentPreset`）渲染 `HeroMotionOptions`，`[data-company-hero-options]` 仍露出；
- `Q1-A`：`records=null` 时 `CultivationAdopted` 内 `.wk-meta` 与 `[role="list"]` 数量均为 `0`；撤回 `pendingIds` 包含 `r-1` 时 `确认撤回` 为 `disabled=true` 但 `取消` 为 `disabled=false`；
- `Q2-A`：`listDeliverables` 返回 rejected Promise，界面保留 `'正在读取这段背景'` 且抛出 `UnhandledRejection`；
- `Q2-B`：`document.visibilityState='hidden'` 派发 `visibilitychange` 后 `listRecords` 调用次数从 `1` 增至 `2`；
- `Q2-C`：`CultivationFeedback` 传入 `{ feedback: null, reachable: true }` 时仍输出 `'人的赞/踩（本会话）事件流不可达'`。

## 根因与证据

1. `BUG-393` 为 `HeroMotionOptions` / `MotionCommandDock` / `CommandScopeHint` 加入了 `isEmbeddedWorkshopSession`，遗漏同文件最底部的 `ComposerStatusPill`；而 `HeroMotionOptions` 原未接入 `useSessions` 校验 `readCompanyRole`；
2. 异步/加载组件只处理了 `.then()` 与终端失败分支，未把 `null`（加载中）从 `unreachable` / 空读写中分离，亦未给 `visibilitychange` 过滤可见态与撤回取消加 `pending` 锁。

## 失败类与同类排查

- **失败类**：槽位装饰组件的会话边界守卫同组漏补，以及 React 异步生命周期未区分 `loading(null)` vs `error/unreachable` 与 `hidden` 触发态。

## 修复证据

- 改动面：`packages/company-pack/src/client/ux/workshop-sessions.ts`、`packages/company-pack/src/client/ux/ambient-chrome.tsx`、`packages/company-pack/src/client/startup/CommandScopeHint.tsx`、`packages/company-pack/src/client/cultivation/cultivation-copy.ts`、`packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx`、`packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx`、`packages/company-pack/src/client/cultivation/cultivation-data.ts`、`packages/company-pack/src/client/cultivation/CultivationCompose.tsx`。
- 红：`pnpm test tests/client/ux/ambient-chrome.spec.ts` 中内嵌工坊漏出 `ComposerStatusPill` 且普通无角色会话曝光 `HeroMotionOptions`；`pnpm test tests/client/cultivation/cultivation-board-actions.spec.ts` 中 `records=null` 空白、撤回等待时取消未禁用、`feedback=null` 误报不可达；`pnpm test tests/client/cultivation/cultivation-context-picker.spec.ts` 与 `pnpm test tests/client/cultivation/cultivation-data.spec.ts` 中 reject 卡死读取、后台切 `hidden` 仍触发轮询。
- 绿：`pnpm test tests/client/ux/ambient-chrome.spec.ts` 与 `pnpm test tests/client/cultivation/cultivation-board-actions.spec.ts` 与 `pnpm test tests/client/cultivation/cultivation-context-picker.spec.ts` 与 `pnpm test tests/client/cultivation/cultivation-data.spec.ts` 及全部 9 份关联 spec（96/96 用例绿），`pnpm typecheck`、`pnpm lint`、`pnpm dup` 零错误零违例。
- 提交：commit cc9da514
