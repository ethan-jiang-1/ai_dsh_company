---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-398：上下文动作丢参、浮窗位置写入空置、Hero 模板无保护覆盖草稿及提示条缺样式/样式重定义

> 严重级别：P2（UX 完整性打折：右栏与消息快捷动作承诺「带入上下文 / 核对草稿 / 记住浮窗位置」，实际只做浅跳转或从未落盘；已有草稿误点模板无保护覆盖；`.wk-command-scope-hint` 在 `styles.ts` 无对应样式）｜发现：2026-11-27｜状态：已修｜审查：2026-11-27 独立只读盲审复审通过（0 阻断；初审 3 项阻断已于 79a562d7 与批次 Note 修复）
>
> **留痕**：commit `bec52daf`（批次 392..398 顺位 4：`composeIntentStore` 与 `deliverablesFocusStore` 贯通、移除 `panel.floatTitle` 虚假位置记忆承诺、Hero/Dock 保留非空草稿、补 `.wk-command-scope-hint` 并去重 `.wk-guide-entry`）；Note [2026-11-27-ux-ui-round2-batch-fixes.md](../../../notes/implemented/2026-11-27-ux-ui-round2-batch-fixes.md)

## 症状

1. **上下文动作丢弃参数与未对比草稿**（Chromium 实测 `K4_final_md_cultivate_drops_context_in_compose`）：
   - 在右栏打开 `final.md`，点击头部「发起复盘培养」或在高管回复下点击「纠正 / 沉淀方法」：虽然弹出了 Toast（并可在提示里提及文件名/消息 ID），跳转到全局 HQ 培养工坊后，顶部 `CultivationCompose` 仍停在折叠未展开状态（`preopenedComposeInputs=0`），传参中的 `{ messageId }` / `{ filePath }` 从未进入 `CompanyHqPage` 表单状态预填为参考背景；
   - 点击 `final.md` 头部的「核对草稿」（`compareDrafts`）仅跳转 `档案 -> 成品` 列表并弹 Toast，既未打开 `drafts/` 也未定位对应条目；
2. **`saveFloatRect` 写入链路从未接线（浮窗位置记忆为死功能）**（Chromium 实测 `R7_float_rect_never_saved`）：[PanelFrame](../../../packages/company-pack/src/client/tabs/company-tabs.tsx#L85-L90) 按钮悬停文案明确承诺 *「下次浮出回到上次位置」* 且点击时读取 `loadFloatRect(window.localStorage, tabKey)`，但全仓 `client/` 从未在浮窗拖拽/缩放或收回时调用 `saveFloatRect`（浮出后 `localStorage` 键列表为 `[]`）；
3. **Hero 速启模板直接覆盖未发送用户输入**（Chromium 实测 `K5_hero_overwrites_unsent_draft`）：在输入框内键入草稿 `MY UNSENT USER DRAFT` 后点击 [HeroMotionOptions](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L107-L111)（或 `MotionCommandDock`）按钮，直接无提示 `inputActions.setDraft(...)` 抹掉用户已写文字；
4. **CSS 落空与冲突重复声明**：[CommandScopeHint.tsx](../../../packages/company-pack/src/client/startup/CommandScopeHint.tsx#L49) 使用 `className="wk-command-scope-hint"`，在 `styles.ts` 内无任何同名样式声明（Chromium 实测 `G2_command_scope_hint_blank_and_css`: `bg: rgba(0, 0, 0, 0), border: 0px`，在窄窗换行挤压在 `策略：自动` 旁）；另 [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts#L604-L623) 与第 974–989 行存在两份冲突的 `.wk-guide-entry` 规则。

## 运行面

- **面 = client**：
  - [contextual-actions.tsx](../../../packages/company-pack/src/client/ux/contextual-actions.tsx#L47-L82)、[register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L160-L185)、[compose-intent-store.ts](../../../packages/company-pack/src/client/cultivation/compose-intent-store.ts)、[CultivationCompose.tsx](../../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx#L118-L152)、[deliverables-focus-store.ts](../../../packages/company-pack/src/client/tabs/deliverables-focus-store.ts) 与 [DeliverablesTab.tsx](../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx#L136-L235)；
  - [locales.ts](../../../packages/company-pack/src/client/locales.ts#L128,L595) 与 [float-geometry.ts](../../../packages/company-pack/src/client/ui/float-geometry.ts#L67-L96)（上游 [slots.ts](../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/contract/slots.ts#L166-L192) 未暴露浮窗位置/拖拽回调）；
  - [ambient-chrome.tsx](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L101-L155)；
  - [CommandScopeHint.tsx](../../../packages/company-pack/src/client/startup/CommandScopeHint.tsx#L49) 与 [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts#L602-L620,L968-L1005)。

## 复现

```sh
pnpm test tests/client/ux/contextual-actions.spec.ts tests/client/ux/company-hq.spec.ts tests/client/tabs/deliverables-tab-states.spec.ts tests/client/tabs/panel-frame.spec.ts tests/client/ux/ambient-chrome.spec.ts tests/client/ui/client-css.spec.ts
```

- `[BUG_CANDIDATE] K4_final_md_cultivate_drops_context_in_compose — hqOpen=true preopenedComposeInputs=0 toastHasFile=false`
- `[BUG_CANDIDATE] R7_float_rect_never_saved — floatKeys=[]`
- `[BUG_CANDIDATE] K5_hero_overwrites_unsent_draft — after="我想立项一个新产品方向..."`
- `[INFO] G2_command_scope_hint_blank_and_css — {"bg":"rgba(0, 0, 0, 0)","border":"0px..."}`

## 根因与证据

1. `openCultivation` 在 [register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L161-L173) 此前只将 `context` 格式化进了 toast 通知文本，未写入 `composeIntentStore`；`compareDrafts` 同理未传 `absolutePath` 也未写入 `deliverablesFocusStore`；
2. 核查上游 [slots.ts](../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/contract/slots.ts#L166-L192) 后确认 `SidebarRightTabInfo` 未暴露浮窗几何读写回调，因此在 `locales.ts` 中移除虚假的位置返回承诺；
3. `HeroMotionOptions` / `MotionCommandDock` 未读 `useInput` 当前草稿而直接覆盖；`styles.ts` 漏配 `.wk-command-scope-hint` 与重复 `.wk-guide-entry`。

## 失败类与同类排查

- **失败类**：入口 Toast/Tooltip 承诺的能力未打通到目标组件消费端，以及样式类名与 CSS 声明脱节。
- **同类排查**：`StrategyButton` 打开 `ops -> strategy` 与 `TasksAction` 打开 `ops -> tasks` 均直接定位子视图，行为与文案相符；另外在 `company-hq.tsx:428` 同步收敛了 `historyCandidates` 对 `capped`/`total` 的读取以通过 `R1:must-use-boundary` 审计。

## 已修判定

- 「纠正 / 沉淀方法」与「发起复盘培养」跳转 HQ 培养工坊时真将上下文（`messageId`/`filePath`）注入并展开创作表单；「核对草稿」传入 `filePath` 并在 `DeliverablesView` 复位筛选且高亮匹配动议；
- 核实上游无浮窗几何回调后，从 `panel.floatTitle` 中移除「下次浮出回到上次位置」的虚假承诺；
- 补齐 `.wk-command-scope-hint` 样式、清理重复 `.wk-guide-entry`，并在非空草稿下保留用户输入。

## 修复证据

- 改动面：`packages/company-pack/src/client/cultivation/compose-intent-store.ts`、`packages/company-pack/src/client/tabs/deliverables-focus-store.ts`、`packages/company-pack/src/client/cultivation/CultivationCompose.tsx`、`packages/company-pack/src/client/tabs/DeliverablesTab.tsx`、`packages/company-pack/src/client/ux/contextual-actions.tsx`、`packages/company-pack/src/client/ux/register-s1-ux.ts`、`packages/company-pack/src/client/ux/company-hq.tsx`、`packages/company-pack/src/client/ux/ambient-chrome.tsx`、`packages/company-pack/src/client/locales.ts`、`packages/company-pack/src/client/ui/styles.ts`、`tests/client/ux/contextual-actions.spec.ts`、`tests/client/ux/company-hq.spec.ts`、`tests/client/tabs/deliverables-tab-states.spec.ts`、`tests/client/tabs/panel-frame.spec.ts`、`tests/client/ux/ambient-chrome.spec.ts`、`tests/client/ui/client-css.spec.ts`
- 红：`pnpm test tests/client/ux/contextual-actions.spec.ts tests/client/ux/company-hq.spec.ts tests/client/tabs/deliverables-tab-states.spec.ts tests/client/tabs/panel-frame.spec.ts tests/client/ux/ambient-chrome.spec.ts tests/client/ui/client-css.spec.ts`（修前 6 组 BUG-398 负例均红：`openDeliverables` 收到 React 事件而非 `filePath`、`CompanyHqPage` 表单不自动展开、`panel.floatTitle` 仍承诺回上次位置、`setDraft` 抹掉已有草稿、缺 `.wk-command-scope-hint` 且 `.wk-guide-entry` 重复）
- 绿：`pnpm test tests/client/ux/contextual-actions.spec.ts tests/client/ux/company-hq.spec.ts tests/client/tabs/deliverables-tab-states.spec.ts tests/client/tabs/panel-frame.spec.ts tests/client/ux/ambient-chrome.spec.ts tests/client/ui/client-css.spec.ts`（6 files, 39/39 passed；`tests/tools/company-static-audit.spec.ts` 14/14 zero violations）
- 提交：commit bec52daf
