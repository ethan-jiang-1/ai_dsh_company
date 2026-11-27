---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-404：页面刷新后环境待办角标误报 `0` /「就绪」，且培养「我提交的」列表把已撤回方法仍标为「已采纳」

> 严重级别：P1（状态撒谎：`cfo` 会话明确挂起 `request_signoff` 审批且右栏 `团队 -> 待办` 已显示「红线测试待办」，但页面刷新后顶栏显示「待办 0」、底部胶囊显示「梦之队就绪」；在 GUI 撤回方法后，上方「我提交的 · 我已处理」仍显示绿色「目标角色语境下的人已采纳」标签）｜发现：2026-11-27｜状态：已修（`cc9da514`）｜审查：独立只读盲审通过（0 阻断）；去向 = [批次Note](../../../notes/implemented/2026-11-27-ux-ui-round3-batch-fixes.md)

## 症状

1. **刷新后顶栏/底部环境待办角标报假 `0`/就绪**（Chromium 实测 `P4_ambient_badges_zero_while_history_pending` + 截图 `r3-02-light-mode-contrast.png`）：
   - 种子场景在 `cfoPendingId` 挂有未决 `approval/asked`（`红线测试待办`），右栏 `团队 -> 待办`（`AttentionTab` 合并了 `pageHistory` 历史重建）实测可读出并显示该待办；
   - 同屏会话顶栏 `HeaderAttentionUtility` 却显示 **`待办 0`**，底部输入框胶囊 `ComposerStatusPill` 显示 **`角色：CEO / 梦之队就绪`**，完全掩盖跨会话/刷新后的真实待批挂起项；
2. **`CultivationMine` 将已撤回的规则仍标成绿色「已采纳」**（Chromium `T5` 全流程 GUI 实测 + 截图 `r3-07-cultivation-full-gui.png`）：
   - 对 `rec-gui-open` 依次完成「采纳 → 验证有用 → 撤回」，下方「已采纳的方法」正确翻为橙色 **`已撤回`** 并移除方法目录；
   - 但同屏上方的「我提交的 · 我已处理」列表行仍显示绿色 Tag **`目标角色语境下的人已采纳 → method-rec-gui-open`**（与下方「已撤回」自相矛盾）。

## 运行面

- **面 = client**：
  - [ambient-chrome.tsx](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L36-L82,L144-L220) 与 [register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L63-L75)（仅包装了实时 `deps.attention`，未接入历史重建待办源）；
  - [CultivationBoardSections.tsx](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L78-L80)。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit-r3/round3-chromium-audit.mjs
```

- `P4_ambient_badges_zero_while_history_pending`：`header="待办 0"`、`pill="角色：CEO 梦之队就绪"`、`attnHasPending=true`；
- `r3-07-cultivation-full-gui.png`：同屏「已采纳的方法」显示 `method-rec-gui-open [已撤回]`，而上方「我提交的 · 我已处理」显示 `[目标角色语境下的人已采纳 → method-rec-gui-open]`。

## 根因与证据

1. `HeaderAttentionUtility`、`SidebarFooterCompanyAction`、`MotionCommandDock` 与 `ComposerStatusPill` 均通过 `attentionObservable` 仅订阅了运行期 `attentionRegistry` 内存事件，刷新页面后历史事件仅由 `AttentionTab` 和 `CompanyHqPage` 的 `pageHistory` 合并，环境角标漏接同一合并读模型；
2. [CultivationMine](../../../packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx#L79) 仅判断 `record.status === 'adopted'`，未判断 `record.revokedAt !== undefined`（`revokedAt` 存在时方法已被撤回）。

## 失败类与同类排查

- **失败类**：同源状态（历史待办、培养撤回生命周期）在同一页面的不同展示块采用不完整的消费判据，造成同屏互相打脸。

## 修复证据

- 改动面：`packages/company-pack/src/client/wiring/attention-source.ts`、`packages/company-pack/src/client/ux/register-s1-ux.ts`、`packages/company-pack/src/client/index.ts`、`packages/company-pack/src/client/ux/ambient-chrome.tsx`、`packages/company-pack/src/client/cultivation/cultivation-copy.ts`、`packages/company-pack/src/client/cultivation/CultivationBoardSections.tsx`。
- 红：仅有 `attentionRegistry` 而未合并 `pageHistory` 时，`pnpm test tests/client/wiring/attention-source.spec.ts` 与 `pnpm test tests/client/ux/ambient-chrome.spec.ts` 刷新后待办计数为 `0`；`CultivationMine` 仅判 `record.status === 'adopted'` 时 `pnpm test tests/client/cultivation/cultivation-board-actions.spec.ts` 仍渲染绿色已采纳标签。
- 绿：`pnpm test tests/client/wiring/attention-source.spec.ts`、`pnpm test tests/client/ux/ambient-chrome.spec.ts`、`pnpm test tests/client/cultivation/cultivation-board-actions.spec.ts` 及全部 9 份关联 spec（96/96 用例绿），`pnpm typecheck`、`pnpm lint`、`pnpm dup` 零错误零违例。
- 提交：commit cc9da514
