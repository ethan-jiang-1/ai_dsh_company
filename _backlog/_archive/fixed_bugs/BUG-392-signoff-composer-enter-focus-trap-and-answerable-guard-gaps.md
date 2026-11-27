---
status: 已修
severity: P0
opened: 2026-11-27
---

# BUG-392：`SignoffComposerCard` 焦点在拒绝按钮或详情折叠上按 Enter 误批双签且未守 `answerable` / 修饰键 / 输入法

> 严重级别：P0（误批准红线审批的数据安全缺陷：用户在「拒绝 (Esc)」按钮或 `<details>` 详情折叠标题 `<summary>` 上聚焦后按 `Enter`，外层容器无条件拦截 `Enter` 并触发 `allowed-once` 批准放行）｜发现：2026-11-27｜状态：已修｜审查：待本批收口独立盲审
>
> **留痕**：commit `1d9368a1`（批次 392..398 顺位 1：`SignoffComposerCard` 键盘/IME/防重入/`answerable` 五道护栏）

## 症状

1. 触发 `request_signoff` 弹出 [SignoffComposerCard](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L154-L238) 后，使用键盘 `Tab` 将焦点移到 `<summary className="wk-signoff-details-toggle">`（展开补充上下文）并按 `Enter`，卡片不展开详情，而是直接调用 `matched.answer('allowed-once')` **误批准该高管红线签字**；
2. 将键盘焦点移到「拒绝 (Esc)」按钮上按 `Enter`，同样触发 `allowed-once` **误批准**而非拒绝；
3. 组合键 `Ctrl+Enter` / `Meta+Enter` / `Alt+Enter` 也会直接批准，缺少 IME 输入法合成拦截与同步防重提交锁；且当 `matched.answerable === false` 时，`批准` / `拒绝` 按钮仍处于可点击启用状态（`disabled={false}`）。

## 运行面

- **面 = client**：[signoff-card.tsx](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L165-L236)（`SignoffComposerCard.handleKeyDown`、`submitDecision` 与操作按钮 `disabled` 属性）。对照上游参考实现：[ApprovalPanel.tsx](../../../vendor/dsh/packages/client/ui-approval/src/client/ApprovalPanel.tsx#L36-L58)。

## 复现

```sh
pnpm test tests/client/ux/signoff-card.spec.ts
```

- 实跑用例 `R5-A`、`R5-B`、`R5-C`（`runtime/tmp/ux-audit-r2/targeted-repro.spec.tsx`）与 `signoff-card.spec.ts` BUG-392 新增用例均直接复现：`<summary>` 与 `拒绝` 按钮上触发 `Enter` 均以 `'allowed-once'` 调用 `matched.answer`；`Ctrl+Enter` 触发批准；`answerable: false` 时批准按钮 `disabled === false`；
- 真模型 Chromium 截图留证：`runtime/tmp/ux-audit-r2/out/shots/p3r2-01-cfo-signoff-card.png`。

## 根因与证据

1. 上游 [ApprovalPanel.tsx](../../../vendor/dsh/packages/client/ui-approval/src/client/ApprovalPanel.tsx#L46-L58) 在容器级 `keydown` 显式设置了五道护栏：
   - `if (event.key === 'Enter' && element.closest('button, a[href], [role="button"]') !== null) return`（放行按钮与 `<summary>` 原生交互）；
   - `if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return`；
   - `event.defaultPrevented` / `event.repeat` / `composing` / `isComposing` / `keyCode === 229` IME 护栏；
   - `waiting.current` 同步锁（React `setSubmitting` 异步重渲染前防同帧双击）。
2. [signoff-card.tsx](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L177-L186) 的 `handleKeyDown` 只判断 `if (busy) return` 和 `event.key === 'Enter' / 'Escape'`，遗漏上述全部护栏，且未消费 `<summary>` 交互豁免（注意 HTML `<summary>` 元素虽是原生可聚焦披露开关但并不必然匹配 `button` 选择器，必须显式包含 `summary, details summary`）。
3. [signoff-card.tsx](../../../packages/company-pack/src/client/ux/signoff-card.tsx#L229-L234) 按钮只传 `disabled={busy}`，未包含 `matched.answerable === false`。

## 失败类与同类排查

- **失败类**：容器级快捷键 `keydown` 未按上游同类模板豁免可交互子元素（`<button>` / `<summary>`）与 IME/修饰键。
- **同类排查**：[CultivationInbox.tsx](../../../packages/company-pack/src/client/cultivation/CultivationInbox.tsx#L204-L215) 仅在 `<input>` 本身绑 `onKeyDown`（拒绝表单外层无容器级 Enter 劫持）；上游 `ApprovalPanel` 已带完整护栏。

## 已修判定

- 按焦点元素豁免 `button, a[href], [role="button"], summary, input, textarea, select`，使 `Tab` 聚焦 `<summary>` / `拒绝` 按钮时按 `Enter` 执行原生展开或拒绝而非批准；
- 补全 `defaultPrevented` / 修饰键 / `repeat` / IME 合成拦截与同步防重提交 `ref` 锁，并将 `disabled={busy || matched.answerable === false}` 同步到双按钮。

## 修复证据

- 改动面：`packages/company-pack/src/client/ux/signoff-card.tsx`、`tests/client/ux/signoff-card.spec.ts`
- 红：`pnpm test tests/client/ux/signoff-card.spec.ts` —— 修复前 1 failed（`<summary>` 与 `拒绝` 按钮焦点按 `Enter` 均误调 `matched.answer('allowed-once')`）
- 绿：`pnpm test tests/client/ux/signoff-card.spec.ts` —— 5/5 passed（`<summary>` / 拒绝按钮 / 修饰键 / `repeat` / IME 全拦截，`answerable=false` 禁用双按钮，同步防重锁生效）
- 提交：commit 1d9368a1
