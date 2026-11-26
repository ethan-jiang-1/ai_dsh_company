---
status: 调查中
severity: P1
opened: 2026-11-27
---

# BUG-387：390px 窄视口下 HQ 培养工坊双栏硬编码横向溢出裁切，展开右栏会全屏遮挡主区与左侧栏入口

> 严重级别：P1（移动端/窄窗响应式失效：`390×844` 下进入「梦之队总部 → 培养工坊」，双栏网格把标题、分页条与「返回对话」全部顶出视口左右边界；会话态右栏分屏在 `390px` 仍占满全宽并拦截左侧栏点击）｜发现：2026-11-27｜状态：调查中

## 症状

1. 在 `390×844` 窄视口下，若此前右栏分屏为开启状态（`22-zh-390x844.png`），`<div data-rightbar-col="true">` 占满全部 390px 宽，完全盖住主对话区与左侧栏按钮（`E3_390_hq_icon_reachability` 实测 `covered-by:ARTICLE.wk-card`，点击 `[data-company-hq-icon]` 超时 30s）；
2. 收起右栏后进入「梦之队总部 → 培养工坊」（`23-zh-hq-cultivation-390.png`），顶部「之队总部」「总部总览」「回对话」全部左右溢出被裁切，页面被 `.wk-hq-cultivation-split` 强制横排撑宽，左栏 `CultivationBoard` 几乎不可见。

## 运行面

- **面 = client + 上游约束**：
  - `company-pack` 侧：[styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L1112-L1118)（`.wk-hq-cultivation-split` 硬编码 `grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);` 且无窄屏媒体查询折叠为单列）及 [第 1022-1059 行](../../packages/company-pack/src/client/ui/styles.ts#L1022-L1059) 头部与 `SegmentedControl` 同列造成横向顶出；
  - 上游 `vendor/dsh` 约束：[AppFrame.tsx](../../vendor/dsh/packages/client/ui-layout/src/client/AppFrame.tsx#L51) 与 [AppFrame.module.css](../../vendor/dsh/packages/client/ui-layout/src/client/AppFrame.module.css#L260-L271) 的右栏列宽/`overflow: visible` 使展开的右栏在 390px 下横盖主区与左侧栏（`vendor/` 只读不改，应对策略应落在窄视口下 `company-pack` 分屏 presets 保护或窄屏提示/自动降级）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs
```

实测输出：
- `[FAIL] E3_390_hq_icon_reachability — covered-by:ARTICLE.wk-card`
- 截图证明：`runtime/tmp/ux-audit/out/shots/22-zh-390x844.png`、`23-zh-hq-cultivation-390.png`。

## 根因与证据

[styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L1112-L1118) 对 `.wk-hq-cultivation-split` 无条件使用 `minmax(320px, 0.85fr)` 第二列；在 `390px` 总宽减去 52px 左轨后内容区仅余 `338px`，第二列独占 `320px` + `14px` gap 直接导致整页 `.wk-hq-header` 与 `.wk-hq-cultivation-board` 超出可视区并被裁剪。对比旧主区 [CultivationView.tsx](../../packages/company-pack/src/client/cultivation/CultivationView.tsx) 的响应式堆叠阈值，S3 迁移至 HQ 时未同步迁移窄屏单列规则。

## 期望判据

- 视口宽 `<= 820px`（含 `390×844`）时 `.wk-hq-cultivation-split` 折叠为单列纵向堆叠，HQ 标题、切换条与「返回对话」完整留在视口内无裁切；
- 窄视口下展开右栏时需不阻止或显式提供返回/收起主视图通路。
