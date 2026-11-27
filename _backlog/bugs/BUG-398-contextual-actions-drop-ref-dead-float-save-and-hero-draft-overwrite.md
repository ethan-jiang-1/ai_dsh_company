---
status: 调查中
severity: P2
opened: 2026-11-27
---

# BUG-398：上下文动作丢参、浮窗位置写入空置、Hero 模板无保护覆盖草稿及提示条缺样式/样式重定义

> 严重级别：P2（UX 完整性打折：右栏与消息快捷动作承诺「带入上下文 / 核对草稿 / 记住浮窗位置」，实际只做浅跳转或从未落盘；已有草稿误点模板无保护覆盖；`.wk-command-scope-hint` 在 `styles.ts` 无对应样式）｜发现：2026-11-27｜状态：调查中

## 症状

1. **上下文动作丢弃参数与未对比草稿**（Chromium 实测 `K4_final_md_cultivate_drops_context_in_compose`）：
   - 在右栏打开 `final.md`，点击头部「发起复盘培养」或在高管回复下点击「纠正 / 沉淀方法」：虽然弹出了 Toast（并可在提示里提及文件名/消息 ID），跳转到全局 HQ 培养工坊后，顶部 `CultivationCompose` 仍停在折叠未展开状态（`preopenedComposeInputs=0`），传参中的 `{ messageId }` / `{ filePath }` 从未进入 `CompanyHqPage` 表单状态预填为参考背景；
   - 点击 `final.md` 头部的「核对草稿」（`compareDrafts`）仅跳转 `档案 -> 成品` 列表并弹 Toast，既未打开 `drafts/` 也未定位对应条目；
2. **`saveFloatRect` 写入链路从未接线（浮窗位置记忆为死功能）**（Chromium 实测 `R7_float_rect_never_saved`）：[PanelFrame](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L85-L90) 按钮悬停文案明确承诺 *「下次浮出回到上次位置」* 且点击时读取 `loadFloatRect(window.localStorage, tabKey)`，但全仓 `client/` 从未在浮窗拖拽/缩放或收回时调用 `saveFloatRect`（浮出后 `localStorage` 键列表为 `[]`）；
3. **Hero 速启模板直接覆盖未发送用户输入**（Chromium 实测 `K5_hero_overwrites_unsent_draft`）：在输入框内键入草稿 `MY UNSENT USER DRAFT` 后点击 [HeroMotionOptions](../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L107-L111)（或 `MotionCommandDock`）按钮，直接无提示 `inputActions.setDraft(...)` 抹掉用户已写文字；
4. **CSS 落空与冲突重复声明**：[CommandScopeHint.tsx](../../packages/company-pack/src/client/startup/CommandScopeHint.tsx#L49) 使用 `className="wk-command-scope-hint"`，在 `styles.ts` 内无任何同名样式声明（Chromium 实测 `G2_command_scope_hint_blank_and_css`: `bg: rgba(0, 0, 0, 0), border: 0px`，在窄窗换行挤压在 `策略：自动` 旁）；另 [styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L604-L623) 与第 974–989 行存在两份冲突的 `.wk-guide-entry` 规则。

## 运行面

- **面 = client**：
  - [contextual-actions.tsx](../../packages/company-pack/src/client/ux/contextual-actions.tsx#L39,L67-L82) 与 [register-s1-ux.ts](../../packages/company-pack/src/client/ux/register-s1-ux.ts#L147-L163)；
  - [company-tabs.tsx](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L85-L90) 与 [float-geometry.ts](../../packages/company-pack/src/client/ui/float-geometry.ts#L67-L96)；
  - [ambient-chrome.tsx](../../packages/company-pack/src/client/ux/ambient-chrome.tsx#L107-L111,L148-L151)；
  - [CommandScopeHint.tsx](../../packages/company-pack/src/client/startup/CommandScopeHint.tsx#L49) 与 [styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L604-L623,L974-L989)。

## 复现

```sh
bash -c 'source run/env.sh && node runtime/tmp/ux-audit-r2/round2-deep-audit.mjs'
```

- `[BUG_CANDIDATE] K4_final_md_cultivate_drops_context_in_compose — hqOpen=true preopenedComposeInputs=0 toastHasFile=false`
- `[BUG_CANDIDATE] R7_float_rect_never_saved — floatKeys=[]`
- `[BUG_CANDIDATE] K5_hero_overwrites_unsent_draft — after="我想立项一个新产品方向..."`
- `[INFO] G2_command_scope_hint_blank_and_css — {"bg":"rgba(0, 0, 0, 0)","border":"0px..."}`

## 根因与证据

1. `openCultivation` 在 [register-s1-ux.ts](../../packages/company-pack/src/client/ux/register-s1-ux.ts#L147-L158) 只将 `context` 格式化进了 toast 通知文本，未写入可被 `CompanyHqPage` / `CultivationCompose` 消费的预填草稿槽位；`compareDrafts` 同理只调了 `safeOpenTab('company-deliverables')`；
2. `float-geometry.ts` 的 `saveFloatRect` 只被迁移路径与单测调用，缺少来自 DockLayout 浮窗几何变化的持久化监听（若上游未暴露位置回调，则提示文案不应虚假承诺）；
3. `HeroMotionOptions` / `MotionCommandDock` 未读现有草稿或仅在非空时追加/确认；`styles.ts` 漏配 `.wk-command-scope-hint` 与重复 `.wk-guide-entry`。

## 失败类与同类排查

- **失败类**：入口 Toast/Tooltip 承诺的能力未打通到目标组件消费端，以及样式类名与 CSS 声明脱节。
- **同类排查**：`StrategyButton` 打开 `ops -> strategy` 与 `TasksAction` 打开 `ops -> tasks` 均直接定位子视图，行为与文案相符。

## 已修判定

- 「纠正 / 沉淀方法」与「发起复盘培养」跳转 HQ 培养工坊时真将上下文（`messageId`/`filePath`）注入并展开创作表单；「核对草稿」真正定位/呈现初稿对照或修正按钮命名与职责一致；
- 接通 `saveFloatRect` 持久化或移除 `panel.floatTitle` 中「下次浮出回到上次位置」的虚假承诺；
- 补齐 `.wk-command-scope-hint` 样式、清理重复 `.wk-guide-entry`，并在非空草稿下避免静默覆盖。
