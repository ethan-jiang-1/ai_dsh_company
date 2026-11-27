---
status: 调查中
severity: P1
opened: 2026-11-27
---

# BUG-403：浮窗含死「收起侧栏」与冗余「浮出」按钮、Hub 切子页销毁表单草稿、`SegmentedControl` 悬空 `aria-controls` 及 `z-index` 压弹窗

> 严重级别：P1（交互坏死与可访问性/层级契约缺陷：浮窗状态下点「收起侧栏」完全无响应且浮窗头仍显无用「浮出」按钮；档案培养切子页瞬间销毁未提交草稿；全部 `SegmentedControl` 产悬空 `aria-controls`；多窗警告横幅 `z-index: 9999` 压过上游弹窗并截获顶部点击）｜发现：2026-11-27｜状态：调查中｜审查：待修前确认

## 症状

1. **`< 768px` 浮窗内「收起侧栏」按钮完全死点 & 浮窗内仍显示冗余「浮出」按钮**（Chromium 实测 `Q7`、`S6` + 截图 `r3-06-floating-narrow-dead-close.png`）：
   - 当用户先浮出 `OpsHub`（`[data-dockkit-float]`），浮窗内部 [PanelFrame](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L81-L94) 仍继续渲染 **`浮出`** 按钮（`Q7_redundant_float_button_inside_floating_pane: count=1`，`unfloatTab` 注入未被使用），点击无意义；
   - 将窗口缩至 `700px` 且主右栏处于折叠状态时，浮窗顶栏因 `useSidebarFullscreen` 与 `viewportWidth < 768` 仍亮出 **`收起侧栏`**（`[data-company-narrow-close]`），点击只执行 `openSplit('quiet')` 对浮窗本身零效果（`S6_narrow_close_button_dead_in_float: stillVisibleAfterClick=true`）；
2. **Hub 子页切换销毁培养输入草稿与流状态**（Chromium 实测 `S4`）：
   - 在 `Archive -> 培养` 展开「开始记录一项工作」填入 `'UNSAVED_R3_DRAFT'` 后，切换到 `台账` 再切回 `培养`，因 [ArchiveHubTab](../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx#L243-L254)（及 `OpsHubTab` / `TeamHubTab`）用条件渲染 `{section === 'cultivation' && <CultivationTab ... />}` 整树卸载，草稿与表单直接归零丢失（`S4_hub_tab_switch_destroys_draft: formGone=true`）；
3. **全部 `SegmentedControl` 悬空 `aria-controls`**（Chromium 实测 `S1`）：
   - 上游 [SegmentedControl.tsx](../../vendor/dsh/packages/client/ui-primitives/src/SegmentedControl.tsx#L126) 给每个 tab 强制生成 `aria-controls={`${id}-${option.value}-panel`}`；但 [company-hub-tabs.tsx](../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx#L98-L160) 与 [company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx) 渲染内容体均未对应设置该 `id` 与 `role="tabpanel"`，Chromium 实测 **`4/4 dangling: company-ops-segments-{board,dag,tasks,strategy}-panel`**；
4. **`#dsh-instance-guard-banner` (`9999`) 与角色顶带 (`2147483647`) 高于上游 `Modal` (`1000`) / `Toast` (`1100`)**（Chromium 实测 `S2` + 截图 `r3-04-zindex-modal-banner.png`）：
   - 上游 [Modal.module.css](../../vendor/dsh/packages/client/ui-primitives/src/Modal.module.css#L10) 与 [Toast.module.css](../../vendor/dsh/packages/client/ui-primitives/src/Toast.module.css#L12) 分别采用 `1000` 和 `1100`；[instance-guard.ts](../../packages/company-pack/src/client/wiring/instance-guard.ts#L56) 设 `z-index: 9999`，[styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L87) 设 `z-index: 2147483647`；Chromium 实测触发多实例横幅后打开底部菜单/弹窗，`elementFromPoint(400, 10)` 直接命中 `#dsh-instance-guard-banner`，视觉与指针层级均压在官方层之上；
5. **`CompanyGuideHub` 打开页签遗漏 `{ replaceTab: true }` 残留空开始页**（Chromium 实测 `S5_guide_hub_misses_replaceTab`）：
   - 点击右栏 `+` 新增「开始」Guide 页签后再点击 `作战板`，对比上游 [GuideBody.tsx](../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tabs/guide/GuideBody.tsx#L151) 使用 `tab.actions.openTab(selected.kind, { replaceTab: true })`，[company-guide.tsx](../../packages/company-pack/src/client/ux/company-guide.tsx#L55-L57) 直接调用 `tab.actions.openTab(kind)`，实测标签栏从 `["档案"]` 变为 **`["档案","开始","作战板"]`**，空 Guide 页签长期残留无法被替掉。

## 运行面

- **面 = client**：
  - [company-hub-tabs.tsx](../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx#L98-L255)、[company-tabs.tsx](../../packages/company-pack/src/client/tabs/company-tabs.tsx#L81-L94)、[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx)、[company-guide.tsx](../../packages/company-pack/src/client/ux/company-guide.tsx#L55-L57)；
  - [instance-guard.ts](../../packages/company-pack/src/client/wiring/instance-guard.ts#L56)、[styles.ts](../../packages/company-pack/src/client/ui/styles.ts#L87)。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit-r3/round3-chromium-audit.mjs
source run/env.sh && node runtime/tmp/ux-audit-r3/phase2b-extra.mjs
```

- `S1_dangling_aria_controls`：`4/4 dangling`；
- `S4_hub_tab_switch_destroys_draft`：`formGone=true`；
- `S5_guide_hub_misses_replaceTab`：`before=["档案"] after=["档案","开始","作战板"]`；
- `Q7_redundant_float_button_inside_floating_pane`：`count=1`；
- `S6_narrow_close_button_dead_in_float`：`btnCount=1 stillVisibleAfterClick=true`（`r3-06-floating-narrow-dead-close.png`）；
- `S2_zindex_banner_vs_modal`：`bannerZ="9999", topHitId="dsh-instance-guard-banner"`（`r3-04-zindex-modal-banner.png`）。

## 根因与证据

1. `PanelFrame` 与 `OpsHubTab` / `TeamHubTab` / `ArchiveHubTab` 未区分当前容器是 `dock` 还是 `float` 宿主体（`TabLayout` 在 `pane.host === 'float'` 上继续挂载同样的 `sidebar.right.pane.tab` 子树），从而在浮窗里同时留下「浮出」与面向右栏的「收起侧栏」；
2. Hub 子页使用互斥条件渲染而非保活隐藏/草稿状态外提；
3. Hub 与 HQ 消费 `SegmentedControl` 未配对 `id={`${id}-${section}-panel`}` 容器；层叠数值未对齐上游 `1000/1100` 标尺。

## 失败类与同类排查

- **失败类**：组件未感知 DockKit `float` 宿主态、ARIA `aria-controls` 单向契约断链及脱离上游设计系统层级标尺。
