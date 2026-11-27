---
status: 调查中
severity: P1
opened: 2026-11-27
---

# BUG-396：键盘与无障碍穿透——`ContextPicker` 搜索框劫持方向键、全局快捷键穿透 Modal/终端、`CultivationView` 堆叠拖拽键失效

> 严重级别：P1（键盘交互与无障碍失效：背景选择器搜索框按 `↓` 劫持光标且 `Esc` 不归还焦点；`Alt+Shift+1/2/3` 在原生弹窗或终端焦点下穿透切页；`CultivationView` 窄屏垂直堆叠态分割线无法用 `↑/↓` 与纵向拖拽调节）｜发现：2026-11-27｜状态：调查中

## 症状

1. **`CultivationContextPicker` 搜索框 `ArrowDown` 劫持与 `Esc` 失焦**（复现用例 `I5`）：聚焦 `.wk-cultivation-context-picker input` 搜索框输入过滤词时，按 `ArrowDown`/`ArrowUp` 本应让用户或输入框正常编辑（且至少不应在有输入移动语义下错乱跳转且无法按键盘返回输入框），而外层容器 `onKeyDown` 无差别接管 `ArrowDown` 将焦点强行踢到 `[role="option"]`，再按 `Escape` 关闭面板时组件注释虽写「焦点回到触发点」，实际调用 `onCancel()` 后未恢复焦点至触发按钮（焦点落回 `document.body`）；
2. **全局快捷键 `Alt+Shift+1/2/3` 穿透 Modal 与终端区域**（复现用例 `K6`）：打开弹窗（`context.modal !== null`）或聚焦终端 `.xterm`（`context.region === 'terminal'`）时按 `Alt+Shift+1/2/3`，`observeFixedInput` 仍消费事件并切换右侧边栏 Hub 页签；
3. **`CultivationView` 窄屏垂直堆叠态仅读水平方向键与 `clientX`**（复现用例 `I6`）：当视口宽度 `< 666px`（`data-stacked="true"`）时，分隔条 CSS 光标已切换为 `row-resize`，但 `onResizeKeyDown` 只响应 `ArrowLeft`/`ArrowRight`（按 `ArrowUp`/`ArrowDown` 无任何变化），`beginResize` 只计算 `event.clientX` 而非 `event.clientY`，同时 `document.addEventListener` 缺少 `window` `blur` 清理或 pointer capture。

## 运行面

- **面 = client**：
  - [CultivationContextPicker.tsx](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx#L88-L117)；
  - [company-triggers-shortcuts.ts](../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts#L173-L188)（对照 [dom.ts](../../vendor/dsh/packages/client/shortcuts/src/client/dom.ts#L70-L76)）；
  - [CultivationView.tsx](../../packages/company-pack/src/client/cultivation/CultivationView.tsx#L142-L175)（对照 [styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L721-L725)）。

## 复现

```sh
pnpm vitest run --config runtime/tmp/ux-audit-r2/vitest.tmp.config.ts
```

- 实跑用例 `I5`、`K6`、`I6` 均已直接复现证实。

## 根因与证据

1. [CultivationContextPicker.tsx](../../packages/company-pack/src/client/cultivation/CultivationContextPicker.tsx#L103-L107) 对键盘事件未区分搜索框与选项区，也未在父级 `CultivationCompose` 保存触发按钮 ref 供 `onCancel` 后归还焦点；
2. [company-triggers-shortcuts.ts](../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts#L175-L177) 的 `observeFixedInput` 回调解构了 `gesture` 却忽略 `input.context.modal` 与 `input.context.region`；
3. [CultivationView.tsx](../../packages/company-pack/src/client/cultivation/CultivationView.tsx#L148-L175) 在 stacked 纵向布局下沿用了横向尺寸数学（`clientX` 与 `ArrowLeft/Right`）。

## 失败类与同类排查

- **失败类**：容器键盘处理器忽略宿主上下文/输入焦点边界与断点切换后的方向映射。
- **同类排查**：`DelegationCard` 与 `TeamToolCard` 使用 `<div role="button" tabIndex={0}>` 支持 `Enter/Space`，不阻断外部流；`ApprovalPanel` 已严格过滤 `modal`/`element` 焦点域。

## 已修判定

- `registerCompanyShortcuts` 在 `input.context.modal !== null || input.context.region === 'terminal'` 时不触发全局切页；
- `CultivationContextPicker` 明确输入框内键盘导航边界（上下键可进入并能顺畅返回搜索框或明确仅在 listbox 内导航），关闭后将焦点交还触发按钮；
- `CultivationView` 在 `stacked` 模式下分隔条支持 `ArrowUp`/`ArrowDown` 及 `clientY` 拖拽并妥善处理失焦收尾。
