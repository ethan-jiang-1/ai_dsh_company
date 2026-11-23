---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-350：`CultivationCompose` 跨会话切换时保留旧 `targetRole`，把自我纠正静默翻转成跨角色建议

> 严重级别：P2（交互/语义错乱：主会话从角色 A 切到角色 B 时，已打开的养成表单不重置也不带 `key`，`targetRole` 仍停留在 A，导致 UI 与提交动作把「记录自己的纠正」悄悄变成「给 A 的跨角色建议」）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

1. [`CultivationCompose`](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx#L88-L106) 仅在首次挂载时执行 `const [targetRole, setTargetRole] = useState(props.viewerRole)`（第 91 行），并在第 106 行依据 `const isSuggest = targetRole !== props.viewerRole` 推导当前动作是本角色自我纠正（`correct`）还是发往其他角色的跨角色建议（`suggest`）；
2. [`CultivationBoard`](../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx#L112) 渲染 `<CultivationCompose ... />` 时既没有传入 `key={props.currentSessionId}`（或 `key={viewer}`），`CultivationCompose` 内部也没有在 `props.viewerRole` 变化时同步未手工改过的默认目标角色或重置草稿；
3. 当用户在 CEO 会话打开了「记录自己的纠正」表单，随后切换到 VP-Eng 会话（`viewerRole` 由 `'ceo'` 变为 `'vp-eng'`）且中间未卸载面板，`targetRole` 仍卡在 `'ceo'`，`isSuggest` 立刻变成 `true`，表单静默变成「这是给 CEO 的建议，由对方角色语境下的人决定；你这边只留回执。」。

## 运行面

- **面 = client UI**：[`packages/company-pack/src/client/cultivation/CultivationCompose.tsx`](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx#L90-L106)、[`packages/company-pack/src/client/cultivation/CultivationBoard.tsx`](../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx#L111-L120)。

## 复现

真实渲染 `CultivationCompose`（`viewerRole: 'ceo'`），点击入口按钮展开表单，此时显示 `'记录自己的纠正'`；随后在同一个挂载实例上以 `viewerRole: 'vp-eng'` 重新 `root.render(...)` 模拟会话/角色切换：

- 实测界面文本随即变为 `'这是给 CEO 的建议'`（未关闭并重开前，`targetRole` 仍为 `'ceo'`，提交会以 VP-Eng 身份发起给 CEO 的跨角色建议而非 VP-Eng 的自我纠正）。

## 根因与证据

1. [`CultivationCompose.tsx` 第 91 行](../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx#L91)把衍生/初始化状态 `targetRole` 锁死在挂载瞬间的 `useState(props.viewerRole)`；
2. 调用方 [`CultivationBoard.tsx` 第 112 行](../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx#L112) 挂载 `<CultivationCompose>` 时未绑定 `key={props.currentSessionId}`（且未按会话切换隔离表单态）。

## 失败类与同类排查

- **失败类**：以 prop 初始的 `useState` 状态未随会话/角色上下文 key 重建或重置。
- **同类排查**：同视图下 `CultivationCompose` 还有 `context` / `currentSessionId` 绑定，若在同一组件上切换 `currentSessionId`，即使同角色两个不同会话也可能携带前一个会话的背景摘录与未发送草稿，需一并按会话维度隔离。

## 修复方案与范围

- **根因修法**：在 `CultivationBoard.tsx` 为 `<CultivationCompose>` 按会话+视角挂 `key={`${props.currentSessionId ?? ''}:${viewer}`}`（或只在有确认需求时随 `viewerRole` 切换重置默认 `targetRole` 与会话上下文），保证切换会话/视角后表单默认目标始终与当前 `viewerRole` 一致。

## 已修判定

- 在已展开表单状态下将 `viewerRole`（或 `currentSessionId`）从 `'ceo'` 切换到 `'vp-eng'` 后，表单不会错翻为「这是给 CEO 的建议」，而是干净重置/同步到当前视角 `'vp-eng'` 的自我纠正态。
