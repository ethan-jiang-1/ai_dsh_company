---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-387：390px 窄视口下 HQ 培养工坊双栏硬编码横向溢出裁切，展开右栏会全屏遮挡主区与左侧栏入口

> 严重级别：P1（移动端/窄窗响应式失效：`390×844` 下进入「梦之队总部 → 培养工坊」，双栏网格把标题、分页条与「返回对话」全部顶出视口左右边界；会话态右栏分屏在 `390px` 仍占满全宽并拦截左侧栏点击）｜发现：2026-11-27｜状态：已修｜审查：agent — 待批次独立只读盲审收口
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：HQ 窄屏单列断点与全屏右栏收起出口）

## 症状

1. 在 `390×844` 窄视口下，若此前右栏分屏为开启状态（`22-zh-390x844.png`），`<div data-rightbar-col="true">` 占满全部 390px 宽，完全盖住主对话区与左侧栏按钮（`E3_390_hq_icon_reachability` 实测 `covered-by:ARTICLE.wk-card`，点击 `[data-company-hq-icon]` 超时 30s）；
2. 收起右栏后进入「梦之队总部 → 培养工坊」（`23-zh-hq-cultivation-390.png`），顶部「之队总部」「总部总览」「回对话」全部左右溢出被裁切，页面被 `.wk-hq-cultivation-split` 强制横排撑宽，左栏 `CultivationBoard` 几乎不可见。

## 运行面

- **面 = client + 上游约束**：
  - `company-pack` 侧：[styles.ts](../../../packages/company-pack/src/client/ui/styles.ts)（`.wk-hq-cultivation-split` `@media (max-width: 820px)` 单列堆叠、`.wk-hq-grid` `minmax(min(100%, 300px), 1fr)` 与头区 `min-width: 0`）、[company-hub-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx)（`sidebar.fullscreen === true` 时提供 `[data-company-narrow-close]` 收起右栏入口并隐藏双分屏按钮）、[company-triggers-shortcuts.ts](../../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts)（`<768px` 禁开双分屏）、[locales.ts](../../../packages/company-pack/src/client/locales.ts)（`layout.closeRightbar` zh/en）；
  - 上游 `vendor/dsh` 约束：[AppFrame.tsx](../../../vendor/dsh/packages/client/ui-layout/src/client/AppFrame.tsx#L51)、[AppFrame.module.css](../../../vendor/dsh/packages/client/ui-layout/src/client/AppFrame.module.css#L260-L271) 与 [SidebarRight.tsx](../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/shell/SidebarRight.tsx#L360)（`<768px` 右栏自动全屏——`vendor/` 只读不改，公司侧通过 Hub 显式收起出口与单栏保护应对）。

## 复现

```sh
pnpm test tests/client/ui/client-css.spec.ts tests/client/ux/company-hub-tabs.spec.ts
```

真浏览器原发现命令：`source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs`（实测 `[FAIL] E3_390_hq_icon_reachability — covered-by:ARTICLE.wk-card` 与 `23-zh-hq-cultivation-390.png` 溢出）。

## 根因与证据

1. [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts) 对 `.wk-hq-cultivation-split` 无条件使用 `minmax(320px, 0.85fr)` 第二列，`.wk-hq-grid` 使用 `minmax(300px, 1fr)`；在 `390px` 下直接把 `.wk-hq-header` 与 `.wk-hq-cultivation-board` 顶出视口导致横向裁切。
2. 上游 `SidebarRight` 在 `<768px` 自动切入 `fullscreen: true`，右栏占满 `100vw`，而公司三大 Hub 顶栏只放了在窄屏无效的「督战分屏 / 审稿分屏」，缺少显式的收起侧栏出口。

## 失败类与同类排查

- **失败类**：固定最小列宽忽略移动端断点 + 上游全屏态缺返回入口。
- **同类排查**：检查老 `CultivationView.tsx` 已有 `splitLayout` + `data-stacked="true"` 响应式堆叠；检查 `OpsHubTab`/`TeamHubTab`/`ArchiveHubTab` 全部三个聚合 Hub 均统一接入 `useSidebarFullscreen` 与 `[data-company-narrow-close]`。

## 已修判定

- 视口宽 `<= 820px` 时 `.wk-hq-cultivation-split` 折叠为单列，`.wk-hq-grid` 使用 `min(100%, 300px)` 无横向溢出；
- `fullscreen=true` 下三大 Hub 顶栏显示 `[data-company-narrow-close]` 并触发 `openSplit('quiet')` 收起右栏；`<768px` 调用 `openSplitPreset` 不强拆双分屏。

## 修复证据

- 改动面：`packages/company-pack/src/client/ui/styles.ts`、`packages/company-pack/src/client/tabs/company-hub-tabs.tsx`、`packages/company-pack/src/client/ux/company-triggers-shortcuts.ts`、`packages/company-pack/src/client/locales.ts`、`tests/client/ui/client-css.spec.ts`、`tests/client/ux/company-hub-tabs.spec.ts`、`tests/client/ux/company-triggers-shortcuts.spec.ts`
- 红：`pnpm test tests/client/ui/client-css.spec.ts tests/client/ux/company-hub-tabs.spec.ts` —— 修复前 2 failed（缺 `<= 820px` 单列折叠与 `min(100%, 300px)`；缺 `[data-company-narrow-close]`）
- 绿：`pnpm test tests/client/ui/client-css.spec.ts tests/client/ux/company-hub-tabs.spec.ts` —— 14/14 passed（CSS 响应式与全屏收起用例全绿）
- 提交：commit abec0ad5
