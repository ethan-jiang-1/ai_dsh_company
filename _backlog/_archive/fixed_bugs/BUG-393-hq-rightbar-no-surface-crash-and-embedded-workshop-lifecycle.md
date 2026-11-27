---
status: 已修
severity: P0
opened: 2026-11-27
---

# BUG-393：全局总部打开态呼唤右栏直弹裸英文报错且内嵌培养工坊存在工作区阻断、死重试按钮与 `started` 跨会话粘连

> 严重级别：P0（功能阻塞：在全局总部 HQ 内点击页脚「待办·看板」或培养背景「打开文件」直接在屏幕顶部弹出英文异常 `sidebarRight: no session surface is mounted`；启动内嵌培养工坊出现「选择工作区 / 选择一个工作区开始」阻断且失败重试按钮无效）｜发现：2026-11-27｜状态：已修｜审查：2026-11-27 独立只读盲审复审通过（0 阻断；初审 3 项阻断已于 79a562d7 与批次 Note 修复）
>
> **留痕**：commit `1d9368a1`（批次 392..398 顺位 1：统一 `openOnSessionSurface` 切回守卫、工坊 `retryNonce`/`mainSessionId` 复位与内嵌 Chrome 抑制、HQ 待办合并历史）；Note [2026-11-27-ux-ui-round2-batch-fixes.md](../../../notes/implemented/2026-11-27-ux-ui-round2-batch-fixes.md)

## 症状

1. **HQ 内呼唤右栏报错**（真浏览器截图实证：`runtime/tmp/ux-audit-r2/out/shots/r2-02-hq-footer-no-surface-error.png`）：打开左侧「梦之队总部」（HQ）占满主区时，点击左下角页脚 `待办 · 看板`（`SidebarFooterCompanyAction`），屏幕正中弹出黑底错误 Toast：**`sidebarRight: no session surface is mounted`**；在 HQ 培养面板点击文件类背景「打开文件 / 打开交付物」同样因未先退出 HQ 面板而触发同一原始英文异常；分栏降级路径 `openSplitPreset(..., 'review')` 缺少兜底 `try/catch` 直接抛未捕获异常；
2. **HQ 内嵌培养工坊渲染「选择工作区」与窄框套娃**（真模型 Chromium 截图实证：`runtime/tmp/ux-audit-r2/out/shots/p3r2-05-hq-embedded-workshop-live.png`）：在已有真实 `cwd` 会话下点击「启动培养对话」，右半侧内嵌区呈现 Hero 空态并显示 `选择工作区` / `选择一个工作区开始`，同时挤入整套 `HeroMotionOptions`（右侧按钮被裁切成 `委派团`）与 `MotionCommandDock`（需求检查 / PRD检查 / 交付检查 / 看板）与 `CommandScopeHint`；
3. **`HqCultivationWorkshop` 失败重试按钮死掉 & `started` 跨会话粘连**（复现用例 `R1`）：`create/retain` 失败进入 `workshop.status === 'error'` 后，点击重试按钮仅执行 `setStarted(true)`（`started` 本已为 `true`，点击无任何网络或创建重试）；在会话 A 点过启动后切到无绑定记录的会话 B，`started` 未随 `mainSessionId` 复位，自动为 B 静默创建新会话；
4. **HQ `总览` 待办未包含历史重建项**：`CompanyHqPage` 仅订阅实时事件登记处 `useAttentionItems`，页面刷新后与 `团队 -> 待办`（包含 `pageHistory` 跨会话重建）结果不一致。

## 运行面

- **面 = client**：
  - [sidebar-right-guard.ts](../../../packages/company-pack/src/client/wiring/sidebar-right-guard.ts)（新增 `openOnSessionSurface` 先调 `selectPanel(null)` 并订阅 `mounted` 就绪后再开右栏）；
  - [register-s1-ux.ts](../../../packages/company-pack/src/client/ux/register-s1-ux.ts#L115-L150)（`safeOpenTab` 接入 `openOnSessionSurface`）；
  - [context-wiring.ts](../../../packages/company-pack/src/client/wiring/context-wiring.ts#L73-L90)（`openContext` 文件分支接入 `openOnSessionSurface`）；
  - [company-triggers-shortcuts.ts](../../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts#L47-L99)（`openSubagentAside` / `openSplitPreset` `review` catch 分支保护）；
  - [company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx)、[workshop-sessions.ts](../../../packages/company-pack/src/client/ux/workshop-sessions.ts)、[ambient-chrome.tsx](../../../packages/company-pack/src/client/ux/ambient-chrome.tsx)、[CommandScopeHint.tsx](../../../packages/company-pack/src/client/startup/CommandScopeHint.tsx)、[register-s3-ux.ts](../../../packages/company-pack/src/client/ux/register-s3-ux.ts)、[index.ts](../../../packages/company-pack/src/client/index.ts)。

## 复现

```sh
pnpm test tests/client/ux/company-hq.spec.ts tests/client/ux/contextual-actions.spec.ts tests/client/wiring/company-context-wiring.spec.ts tests/client/ux/company-triggers-shortcuts.spec.ts tests/client/ux/ambient-chrome.spec.ts tests/client/startup/command-scope-hint.spec.ts
```

- Chromium 实证截图：`r2-02-hq-footer-no-surface-error.png`（Toast `sidebarRight: no session surface is mounted`）、`p3r2-05-hq-embedded-workshop-live.png`（内嵌槽显示 `选择工作区 / 选择一个工作区开始` 且裁切 `HeroMotionOptions`）；
- 白盒用例 `R1`、`J5` 与上述 6 份 spec 新增守卫用例修复前全部红。

## 根因与证据

1. 上游 [service.ts](../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/service.ts#L187-L196) 当 `main` 被全局面板占据或无会话挂载时，`sidebarRight.mounted` 为 `undefined`，`openTab`/`openResource` 均会抛出 `Error('sidebarRight: no session surface is mounted')`。只有 [register-s3-ux.ts](../../../packages/company-pack/src/client/ux/register-s3-ux.ts#L105-L108)（`openFinal`）和 [index.ts](../../../packages/company-pack/src/client/index.ts#L168-L173)（`openSubagentAside`）先调用了 `layout.selectPanel(null)`，`safeOpenTab` 与 `openContext` 均漏调。
2. [company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx#L108-L130) 原先以 `{ variant: 'embedded', phase: 'hero', hero: true }` 挂载空 `conversation.content`，触发上游空白 Hero 与外围 `MotionCommandDock`/`HeroMotionOptions`/`CommandScopeHint` 挤进窄栏，且 `started` 与 retry token 未解耦也未按 `mainSessionId` 复位。

## 失败类与同类排查

- **失败类**：从全局 `main` 面板跨区触发依赖会话级 `sidebarRight` 的动作未统一切回会话主视图并等待 `mounted` 就绪；内嵌会话复用了顶层会话级 Hero/CommandDock Chrome 且局部生命周期未随 `mainSessionId` 重置。
- **同类排查**：`openFinal`（[register-s3-ux.ts](../../../packages/company-pack/src/client/ux/register-s3-ux.ts#L106)）与 `openSubagentAside` 现统一接入 `openOnSessionSurface`；`CompanyHqPage` 总览待办与 `AttentionTab` 统一复用 `readPendingAcrossSessions` + `mergeAttention`。

## 已修判定

- `safeOpenTab`、`openContext`（文件源）、`openFinal`、`openSubagentAside` 与 `openSplitPreset` 在主区挂全局面板时先安全切回会话并等待 `sidebarRight.mounted` 就绪（异常安全退避不向外泄漏英文内部异常）；
- `HqCultivationWorkshop`：`startedSession` 按 `mainSessionId` 判定复位，错误重试递增 `retryNonce`；`HqCultivationConversationSlot` 固定传 `{ variant: 'embedded', phase: 'active', hero: false }` 并经 `workshop-sessions` 抑制顶层 Hero/动议带/提示条；
- HQ `总览` 待办区注入 `pageHistory` 与 `AttentionTab` 保持跨会话历史一致性。

## 修复证据

- 改动面：`packages/company-pack/src/client/wiring/sidebar-right-guard.ts`、`packages/company-pack/src/client/ux/workshop-sessions.ts`、`packages/company-pack/src/client/ux/register-s1-ux.ts`、`packages/company-pack/src/client/wiring/context-wiring.ts`、`packages/company-pack/src/client/ux/company-triggers-shortcuts.ts`、`packages/company-pack/src/client/ux/company-hq.tsx`、`packages/company-pack/src/client/ux/ambient-chrome.tsx`、`packages/company-pack/src/client/startup/CommandScopeHint.tsx`、`packages/company-pack/src/client/ux/register-s3-ux.ts`、`packages/company-pack/src/client/index.ts`、`tests/client/ux/company-hq.spec.ts`、`tests/client/ux/contextual-actions.spec.ts`、`tests/client/wiring/company-context-wiring.spec.ts`、`tests/client/ux/company-triggers-shortcuts.spec.ts`、`tests/client/ux/ambient-chrome.spec.ts`、`tests/client/startup/command-scope-hint.spec.ts`
- 红：`pnpm test tests/client/ux/company-hq.spec.ts tests/client/ux/contextual-actions.spec.ts tests/client/wiring/company-context-wiring.spec.ts tests/client/ux/company-triggers-shortcuts.spec.ts tests/client/ux/ambient-chrome.spec.ts tests/client/startup/command-scope-hint.spec.ts` —— 修复前 5 failed（`safeOpenTab`/`openContext` 未 `selectPanel(null)`、`openSplitPreset('review')` 抛错、`HqCultivationConversationSlot` 传 `hero: true`、`error` 态重试 dead、`mainSessionId` 切换误建会话、总览缺 `pageHistory`）
- 绿：`pnpm test tests/client/ux/company-hq.spec.ts tests/client/ux/contextual-actions.spec.ts tests/client/wiring/company-context-wiring.spec.ts tests/client/ux/company-triggers-shortcuts.spec.ts tests/client/ux/ambient-chrome.spec.ts tests/client/startup/command-scope-hint.spec.ts` —— 6 文件 35/35 passed（`pnpm typecheck` 同步 PASS）
- 提交：commit 1d9368a1
