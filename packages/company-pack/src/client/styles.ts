/**
 * 本包 client 面的样式表：每次挂载注入自有 `<style>`，随 fiber dispose 移除。
 *
 * 为什么不是 CSS Modules（条目 ① S0 决定，2026-09-23）：本包 client 半的 tsdown 配置是手抄的
 * 关键产物契约（banner/footer/externals），**没有** vendor 那套 lightningcss 的 `x.module.css`
 * 流水线；接上它要复刻 vendor 的 CSS 插件链（`packages/client/tsdown.client.ts:502-557`），
 * 收益不抵风险。样式量增长到确需作用域隔离时再回头接。
 *
 * 纪律：颜色一律走平台令牌 `--dsw-*`（`docs/web-styling.md:11,17-18` 禁 feature 包写字面颜色）；
 * 动效复用 `--ds-ease-in-out` / `--ds-transition-duration[-fast|-slow]`，并给
 * `prefers-reduced-motion: reduce` 回退（官方惯例，vendor 内 28 个样式表已这么做）。
 */

/** 本包 client 面的样式：S1 视图类名、S2 皮肤类名、S3 动效 keyframes 都加在这里。 */
const CSS = `
:root {
  /* 公司视图的布局旋钮（本包私有；颜色不在此声明，一律用 --dsw-* 令牌） */
  --wk-board-column-min: 13rem;
  --wk-row-gap: 0.35rem;
}

/* 侧栏会话行首的角色标记（角色身份 UX · B 段）：
   品牌色小标记 + 单字母——每个会话行一眼可辨"这扇门是谁"。
   ⚠ 尺寸由**座位**定，不由审美定：座位是 16px 格，且是 list 座位（与 12px 的计划任务
   时钟图标同格共存），故标记按 12px 设计 —— 3 字药丸（32.45px）实测左溢 8.22px /
   右溢 8.23px：左溢把标记推出行框（窄窗被容器切字）、右溢吃掉 4px 标题间隙压到
   标题首字盒上（2026-10-13 修，真 DOM 判据 = probes/browser-visual/sidebar-role-mark-probe.mjs；
   守卫 = tests/client/client-css.spec.ts「座位上限」）。
   颜色纪律见下方「角色色调」块（只用平台令牌；feature 包不写字面色）。 */
.wk-role-badge {
  flex: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  padding: 0;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-inverted);
  user-select: none;
}

/* 角色色调（2026-10-13 从"五角色同一品牌色"放开为**五色**）：
   **两个通道**——上面的字母管"是谁"，底下的颜色管"一眼扫过是谁"（12px 的字母在侧栏快速
   扫读时面积太小，底色是更大的色块；CEO 也是唯一用 adaptive 品牌色的一格，与 C 段窗口色条同源）。
   颜色纪律：只用平台令牌。CEO = **adaptive** 的 --dsw-alias-* 对（浅主题近黑底/白字，
   深主题自动反转，实测对比 18.9 / 18.1）；其余四色 = **static** 色相（固定值，两主题同一观感），
   字色按"该底色上对比度更高的那一侧"选：blue-600 + 白 5.17 / green-500 + 黑 9.22 /
   amber-500 + 黑 9.78 / red-600 + 黑 4.67（全 ≥ WCAG AA 4.5）。
   真判据（五底色互异 + 逐色对比度 ≥ 4.5）= sidebar-role-mark-probe 的 G6（读真 computed 值现算）。 */
.wk-role-badge[data-wk-role='cfo'] {
  background: var(--dsw-static-blue-600);
  color: var(--dsw-static-neutral-00);
}
.wk-role-badge[data-wk-role='coo'] {
  background: var(--dsw-static-green-500);
  color: var(--dsw-static-neutral-1000);
}
.wk-role-badge[data-wk-role='vp-eng'] {
  background: var(--dsw-static-amber-500);
  color: var(--dsw-static-neutral-1000);
}
.wk-role-badge[data-wk-role='vp-sales'] {
  background: var(--dsw-static-red-600);
  color: var(--dsw-static-neutral-1000);
}

/* 整窗角色色条（角色身份 UX · C 段）：当前会话有角色时，窗口最顶出现一条品牌色细带
   ——并排多窗时"哪扇是公司门"一眼可辨（角色区分靠窗口标题的【角色】前缀；
   每角色不同色需上游分类色板，见提案开放问题 2）。 */
:root[data-wk-role] body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 2147483647;
  background: var(--dsw-alias-brand-primary);
  pointer-events: none;
}

/* 仅供屏幕阅读器的文本（列头/状态的可访问名） */
.wk-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ── 公司整页视图（条目 ① S1）：颜色一律 --dsw-* 令牌，尺寸用字面量 ── */
.wk-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  /* 落在会话内容列内（Chat 同款几何）。铺满整列会压到内容列两侧的 .widthHandle 抓取条——
     实测（2026-09-23）：左拖柄占 455→495，正好盖住第四个页签，真实用户点不动。 */
  width: min(100%, var(--dsh-chat-content-width, 100%));
  margin: 0 auto;
}
.wk-view-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.wk-tab {
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.wk-tab:hover { background: var(--dsw-alias-interactive-bg-hover); }
.wk-tab[aria-selected='true'] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
.wk-view-body { flex: 1; min-height: 0; overflow: auto; padding: 12px; }
.wk-meta { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.wk-error { color: var(--dsw-alias-state-error-primary); font-size: 13px; }
.wk-section-title { font-size: 13px; font-weight: 600; margin: 14px 0 6px; }

/* 看板 */
.wk-board { display: flex; gap: 12px; align-items: flex-start; }
.wk-column {
  flex: 1 1 0;
  min-width: var(--wk-board-column-min);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  padding: 8px;
}
.wk-column-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 13px; }
.wk-column-count { color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.wk-card {
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}
.wk-card-subject { font-size: 13px; line-height: 1.45; word-break: break-word; }
.wk-card-foot { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px; }
.wk-card-id { color: var(--dsw-alias-label-tertiary); font-size: 11px; font-variant-numeric: tabular-nums; }

/* 在场 + 动态 */
.wk-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.wk-row-name { flex: 0 0 11rem; display: flex; align-items: center; gap: 6px; font-size: 13px; }
.wk-row-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.wk-row-task {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.4;
}
/* 所有摘要行都吃两行边界（行高稳定）；只有展开态解除——是否给「全文」入口由组件量出的溢出决定。 */
.wk-row-summary.is-expanded .wk-row-task {
  display: block;
  overflow: visible;
}
.wk-ledger-list .wk-row { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; }
.wk-ledger-list .wk-row-name,
.wk-ledger-list .wk-row-status { min-width: 0; overflow-wrap: anywhere; }
.wk-ledger-list .wk-row-summary { width: 100%; }
.wk-ledger-list .wk-row-task { overflow-wrap: anywhere; }

/* 成品目录（2026-10-19）：摘要 2 行 + 四列；窄视口单列堆叠。 */
.wk-catalog-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 6px; }
.wk-catalog-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.wk-catalog-foot { margin-top: 10px; }
.wk-catalog-foot code { font-size: 11px; }
.wk-deliverable-list .wk-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "head action" "summary summary";
  align-items: start;
  gap: 2px 8px;
}
.wk-deliverable-list .wk-row-name { grid-area: head; flex: none; min-width: 0; flex-wrap: wrap; align-items: baseline; }
.wk-deliverable-slug { min-width: 0; overflow-wrap: anywhere; }
.wk-deliverable-meta { flex: 1 0 100%; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.wk-deliverable-list .wk-row-summary { grid-area: summary; width: 100%; min-width: 0; }
.wk-deliverable-open { grid-area: action; justify-self: end; align-self: start; }
.wk-activity { margin: 4px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.wk-activity li { margin: 2px 0; }

/* 用量 */
.wk-usage-total { font-size: 20px; font-variant-numeric: tabular-nums; }
.wk-usage-row { margin: 8px 0; max-width: 32rem; }
.wk-usage-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.wk-bar { height: 6px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; margin-top: 4px; }
.wk-bar-fill { height: 100%; background: var(--dsw-alias-state-business-primary); }

/* DAG */
/* 画布自适应栏宽（2026-09-28 两轮试用反馈）：缩放走**组件内联的 transform: scale()**
   （company-panels.tsx 按容器实测宽算系数，0.75 触底后内盒超宽由容器横向滚动接管）。
   ⚠ 不用 CSS 宽度缩放（max-width:100%）：Safari/WebKit 里 foreignObject 内的 HTML 不跟
   SVG 的 CSS 宽度缩放走——卡片和线缩了、节点文字留在原位堆向左上角（用户实测事故）。 */
.wk-dag-svg { display: block; }
/* 依赖图节点卡：纯 SVG 内容（2026-09-28 第三轮定稿，foreignObject 已移除——
   Safari/WebKit 下 HTML 不跟 SVG 缩放、文字堆左上角）。文字 fill 走令牌。 */
.wk-dag-node-title { font-size: 11px; fill: var(--dsw-alias-label-primary); }
.wk-dag-owner-pill { fill: var(--dsw-alias-bg-layer-2); }
.wk-dag-owner { font-size: 10px; fill: var(--dsw-alias-label-secondary); }
.wk-dag-dot[data-status='completed'] { fill: var(--dsw-alias-state-success-primary); }
.wk-dag-dot[data-status='in_progress'] { fill: var(--dsw-alias-state-business-primary); }
.wk-dag-dot[data-status='pending'] { fill: var(--dsw-alias-state-idle-primary); }
.wk-dag-wait { font-size: 10px; fill: var(--dsw-alias-state-warn-primary); }
.wk-dag-ready { font-size: 10px; fill: var(--dsw-alias-state-success-primary); }
.wk-dag-progress { font-size: 10px; fill: var(--dsw-alias-state-business-primary); }
.wk-dag-done { font-size: 10px; fill: var(--dsw-alias-label-secondary); }
/* 状态化：进行中 = 主色描边；完成 = 整卡降透明度（依赖图一眼看出"卡在哪一拨"）。
   ⚠ 降透明度**不能写在 .wk-node 自己身上**：它带入场动画（animation: wk-node-in … both，
   关键帧动 opacity 0→1），而 CSS 级联里 **animation 声明高于普通作者声明** ⇒ 动画结束态的
   opacity:1 会把这里的 0.55 吃掉（与 2026-09-25 transform 覆盖定位同类的坑，已实测两次）。
   故一律落在**不被动画的子元素**上。 */
.wk-node[data-status='in_progress'] .wk-dag-card { stroke: var(--dsw-alias-state-business-primary); stroke-width: 1.5; }
.wk-node[data-status='completed'] .wk-dag-card,
.wk-node[data-status='completed'] .wk-dag-node { opacity: 0.55; }

/* ── S2 皮肤：旧组件（委派卡 / 任务板弹窗 / 驾驶舱行）令牌化 ── */

/* 委派工具卡：左边色带表状态（绿=已交稿 / 红=失败 / 黄=中止 / 中性=进行中） */
.wk-delegation {
  border: 1px solid var(--dsw-alias-border-l2);
  border-left: 3px solid var(--dsw-alias-border-l3);
  border-radius: 10px;
  padding: 8px 10px;
  margin: 4px 0;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
}
.wk-delegation[data-state='ok'] { border-left-color: var(--dsw-alias-state-success-primary); }
.wk-delegation[data-state='error'] { border-left-color: var(--dsw-alias-state-error-primary); }
.wk-delegation[data-state='stopped'] { border-left-color: var(--dsw-alias-state-warn-primary); }
.wk-delegation-head { display: flex; align-items: baseline; gap: 8px; }
.wk-delegation-head[role='button'] { cursor: pointer; }
.wk-delegation-role { font-weight: 600; }
.wk-delegation-state { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.wk-delegation-title { font-weight: 500; margin-top: 4px; }
.wk-delegation-pre {
  white-space: pre-wrap;
  margin: 4px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.wk-delegation-result {
  white-space: pre-wrap;
  margin: 2px 0 0;
  max-height: 18rem;
  overflow: auto;
  font-size: 12px;
}
.wk-delegation-actions { margin-top: 6px; }

/* 头部动作的浮层（任务板） */
.wk-popover {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 110;
  min-width: 34rem;
  max-width: 46rem;
  max-height: 24rem;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-specific-menu);
  box-shadow: var(--dsw-elevation-prominent);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
}
.wk-popover-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.wk-popover-head strong { font-weight: 600; }
.wk-table { border-collapse: collapse; width: 100%; }
.wk-table th {
  text-align: left;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  padding: 2px 6px;
  white-space: nowrap;
}
.wk-table td { padding: 2px 6px; vertical-align: top; }
/* 任务正文列：给足宽度再换行——原实现 26rem 弹窗把长标题挤成竖排 */
.wk-table td[data-col='subject'] { min-width: 16rem; white-space: normal; word-break: break-word; }
.wk-table td[data-col='id'], .wk-table td[data-col='status'],
.wk-table td[data-col='owner'] { white-space: nowrap; }
/* 依赖列：人读优先（owner · subject），id 灰字次要；窄栏允许换行，2 行钳制后仍保留全量 DOM 文本。 */
.wk-table td[data-col='blocked'] { min-width: 10rem; white-space: normal; }
.wk-deps { display: inline-flex; flex-wrap: wrap; gap: 2px 8px; }
.wk-dep { display: inline-flex; align-items: baseline; gap: 3px; min-width: 0; }
.wk-dep-owner { flex: none; }
.wk-dep-sep { color: var(--dsw-alias-label-tertiary); }
.wk-dep-subject {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
  max-width: 14rem;
}
.wk-dep-missing { color: var(--dsw-alias-state-warn-primary); }
.wk-cell-id { color: var(--dsw-alias-label-tertiary); font-size: 12px; font-variant-numeric: tabular-nums; margin-right: 4px; }

/* 右栏驾驶舱（Company 页签）：在场板 + 动态流 */
.wk-pane { padding: 8px 12px; font-size: 13px; line-height: 1.5; text-align: left; color: var(--dsw-alias-label-primary); }
/* 内容区横向滚动（UX 走查 2026-09-28）：窄浮窗（最小 220px 钳制）下任务板表格横向溢出、
   overflow:visible 会把内容裁到够不着——滚动而不是裁切。 */
.wk-pane-body { overflow-x: auto; }
.wk-pane-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: nowrap; }
.wk-pane-head > strong { flex: none; white-space: nowrap; }
.wk-pane-head .wk-meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wk-pane-head > button { flex: none; white-space: nowrap; }
.wk-list { display: grid; gap: 4px; }

/* 培养 GUI 行动面（2026-10-17 S2–S5）：创作入口 / 治理按钮 / 判断材料 / 后果说明 */
/* 培养行 = 堆叠块：名字/正文/按钮各占整行（窄列会把「我的纠正」挤成一字一行——2026-10-18 夹具实测）。 */
.wk-cultivation-list .wk-row { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; row-gap: 4px; }
.wk-cultivation-list .wk-row-name { flex: none; flex-wrap: wrap; min-width: 0; overflow-wrap: anywhere; }
.wk-cultivation-list .wk-row-task { width: 100%; overflow-wrap: anywhere; }
.wk-cultivation-compose-entry { display: flex; flex-wrap: wrap; gap: 8px; }
.wk-cultivation-compose-form { display: grid; gap: 8px; }
.wk-cultivation-roles { display: flex; flex-wrap: wrap; gap: 6px; }
.wk-cultivation-body-input,
.wk-cultivation-reason {
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 6px 8px;
}
.wk-cultivation-body-input { width: 100%; resize: vertical; font-size: 12px; line-height: 1.5; }
.wk-cultivation-reason { flex: 1; min-width: 12rem; font-size: 12px; }
.wk-cultivation-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
  border-left: 2px solid var(--dsw-alias-border-l2);
  padding-left: 8px;
}
.wk-cultivation-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.wk-cultivation-teammate { border-left: 2px solid var(--dsw-alias-state-warn-primary); padding-left: 8px; }
.wk-cultivation-context { display: grid; gap: 6px; }
.wk-cultivation-context-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.wk-cultivation-context-card {
  display: grid; gap: 4px; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px; background: var(--dsw-alias-bg-layer-1); min-width: 0;
}
.wk-cultivation-context-card-head { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
.wk-cultivation-context-excerpt { font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.wk-cultivation-context-picker {
  display: grid; gap: 6px; padding: 8px; border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px; max-height: 280px; overflow: auto;
}
.wk-cultivation-context-picker-head { display: grid; gap: 4px; }
.wk-cultivation-context-list { display: grid; gap: 2px; }
.wk-cultivation-context-option {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; justify-content: space-between;
  width: 100%; padding: 4px 6px; border: 0; border-radius: 4px; background: transparent;
  color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.wk-cultivation-context-option:hover,
.wk-cultivation-context-option:focus-visible { background: var(--dsw-alias-interactive-bg-hover); outline: none; }
.wk-cultivation-context-privacy { font-size: 11px; }

.wk-cultivation-reject { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.wk-cultivation-outcome { color: var(--dsw-alias-state-success-primary); }
.wk-cultivation-problem { color: var(--dsw-alias-state-warn-primary); }
.wk-cultivation-confirm { display: grid; gap: 6px; width: 100%; }
.wk-cultivation-consequence { display: block; width: 100%; }
.wk-cultivation-field { display: grid; gap: 2px; }
.wk-cultivation-hint { margin: 0; }
.wk-cultivation-commands { margin-top: 6px; }
.wk-cultivation-commands > summary { cursor: pointer; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.wk-row-head { color: var(--dsw-alias-label-tertiary); font-size: 12px; border-bottom: 0; }
.wk-row-status { flex: 0 0 auto; }
.wk-row-button {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.wk-row-button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.wk-activity-block { border-top: 1px solid var(--dsw-alias-border-l1); margin-top: 8px; padding-top: 6px; }

/* ── S3 动效层（零依赖：纯 CSS keyframes；令牌复用 --ds-*，reduced-motion 在末尾统一关） ── */

/* DAG 边：done = 画出来（pathLength=1 归一化，所以 dashoffset 1→0 与真实长度无关）；
   未就绪 = 虚线流动（提示"还在等"） */
@keyframes wk-edge-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes wk-edge-flow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -0.05; }
}
/* 节点入场 */
@keyframes wk-node-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
/* 动态流新条目从左侧滑入 */
@keyframes wk-slide-in {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}
.wk-edge { animation: wk-edge-draw var(--ds-transition-duration-slow) var(--ds-ease-in-out) both; }
.wk-edge[data-done='false'] { animation: wk-edge-flow 1.2s linear infinite; }
.wk-node { animation: wk-node-in var(--ds-transition-duration) var(--ds-ease-in-out) both; }
/* 只有最新的那条动（列表倒序 ⇒ :first-child 就是新条目；key 稳定 ⇒ 旧条目不会重放动画） */
.wk-activity li:first-child { animation: wk-slide-in var(--ds-transition-duration) var(--ds-ease-in-out) both; }

/* ── 视觉打磨（条目 ③）：空态/加载态统一 + 内联样式收口 ── */

/* 空态 / 加载态：一处定义（StateNote 组件用），避免各面板各写各的 */
.wk-empty { opacity: 0.75; }
.wk-loading { opacity: 0.75; font-style: normal; }

/* 行内小间距（原为内联 style 字面量，收进类里便于统一调） */
.wk-mt-xs { margin-top: 0.2rem; }
.wk-mt-sm { margin-top: 0.4rem; }
.wk-mb-xs { margin-bottom: 0.3rem; }
.wk-lead-note { margin: 0.25rem 0 0.5rem; }
.wk-tabstrip-meta { align-self: center; padding-right: 0.25rem; }

/* DAG 边：颜色进 CSS（原内联），并修对比度——
   ① 待办边：原 border-l3 在浅色下只有 1.47（几乎看不见）⇒ 换 label-tertiary（3.71 / 8.54 ✓）
   ② 已走通边：success-primary 深浅同值（green-500），浅色下仅 2.28 ⇒ 用 color-mix 把它混向标签墨色
      （浅色变深、深色变亮，两主题同时达标：4.14 / 9.93 ✓）；color-mix 不支持时回退到原令牌 */
.wk-edge { fill: none; stroke: var(--dsw-alias-label-tertiary); stroke-width: 1.5; }
.wk-edge[data-done='true'] {
  stroke: var(--dsw-alias-state-success-primary);
  stroke: color-mix(in srgb, var(--dsw-alias-state-success-primary) 70%, var(--dsw-alias-label-primary));
  stroke-dasharray: 1;
}
.wk-edge[data-done='false'] { stroke-dasharray: 0.02 0.015; }
/* 箭头尖：**双 marker 显式上色**（不用 SVG2 context-stroke——Chrome 124+ / Firefox 支持，
   Safari 无信号；不支持时 marker 会 fallback 成黑，深色主题下箭头直接消失）。 */
.wk-arrow-tip-wait { fill: var(--dsw-alias-label-tertiary); }
/* 第二行 fill 是 color-mix 的渐进增强：不支持时回退到上一行令牌（同 .wk-edge[data-done] 的写法）。 */
.wk-arrow-tip-done {
  fill: var(--dsw-alias-state-success-primary);
  fill: color-mix(in srgb, var(--dsw-alias-state-success-primary) 70%, var(--dsw-alias-label-primary));
}

@media (prefers-reduced-motion: reduce) {
  /* 动效层统一关闭（官方惯例：28 个 vendor 样式表都这么做）。
     注意选择器要逐个点名——.wk-motion 只是给未来新元素预留的开关。 */
  .wk-motion,
  .wk-edge,
  .wk-edge[data-done='false'],
  .wk-node,
  .wk-activity li:first-child {
    transition: none !important;
    animation: none !important;
  }
}

/* ── 公司页签标题（icon × 语义色向，RFC 2026-09-27；tab-icons.tsx 消费）─────────
   色 = 方向（琥珀注意 / 蓝执行 / 紫机制 / 绿人心），icon = 面板身份；族内主/次两档。
   颜色一律平台**静态色相族**令牌——跨浅/深主题稳定的识别色；alias 墨色层在暗色下
   退化为墨/白，不能当识别色（RFC §色令牌）。只给 icon 上色，文字保持默认前景。 */
.wk-tab-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.wk-tab-title svg {
  flex: none;
}
.wk-tone-attention { color: var(--dsw-static-amber-500); }    /* 待办：注意·要人（橙·中） */
.wk-tone-burn      { color: var(--dsw-static-amber-400); }    /* 用量：注意·消耗（橙·亮） */
.wk-tone-overview  { color: var(--dsw-static-blue-600); }     /* 看板：执行·总览（正蓝锚点） */
.wk-tone-work      { color: var(--dsw-static-blue-800); }     /* 任务板：执行·工作台（藏青——与看板深浅分明） */
.wk-tone-structure { color: var(--dsw-static-deepseek-400); } /* 依赖图：机制·结构（淡紫蓝——与正蓝拉开明度） */
.wk-tone-archive   { color: var(--dsw-static-amber-600); }    /* 台账：账（赭色——移出蓝系，账本皮革色） */
.wk-tone-people    { color: var(--dsw-static-green-500); }    /* 在场：人·在线 */
.wk-tone-growth    { color: var(--dsw-static-green-400); }    /* 培养：人·成长 */

/* 2026-09-27 配色微调（用户走查：四蓝一片分不清）：蓝系 4→3 且拉开明度
   （正 blue-600 / 淡紫 deepseek-400 / 藏青 blue-800），台账移出蓝系换 amber-600。
   口诀更新：琥珀喊你和记账（三档橙），三蓝干活分深浅，绿色是人。
   ⚠ 深底注意：blue-800 rgb(30,64,175) 饱和蓝暗底可见；deepseek-800 以下禁用（暗底隐身）。 */

/* guide 条目胶囊（Start 页；接管自 vendor EntryBox——槽 sidebar.right.tab.guide.entry）：
   视觉对齐出厂胶囊（圆角、hover 底色全令牌），外加 Tooltip（组件层）与原生 title（chip 侧）。 */
.wk-guide-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: none;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.wk-guide-entry:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.wk-guide-entry-label {
  font-weight: 500;
}

/* ── 浮窗身份识别（用户走查 2026-09-27：浮窗背景全一样，认不出哪个是哪个）─────────────
   ① 面板顶 3px tone 色条（wk-pane-strip；background 吃 currentColor = tone 类的色）——
      对齐 RoleBadge「整窗角色色条」的既有语言，dock 态也带（split 并看时同样受用）。
   ② 浮窗头标题 tinted 色丸（CSS 上下文选择器只命中浮窗头，侧栏 chip 不受影响）——
      浮窗标题栏永远可见，是最强的一眼识别信号。 */
.wk-pane-strip {
  height: 3px;
  flex: none;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.85;
}
[data-dockkit-float-title] .wk-tab-title {
  background: color-mix(in srgb, currentColor 14%, transparent);
  padding: 0.12rem 0.55rem;
  border-radius: 999px;
}

/* ── 浮窗 Z 序修复（用户报 2026-09-28：点后面的浮窗不置顶）────────────────────
   根因（vendor rc.2 格子化浮窗路径）：浮窗 cell 统一 z-index 60（--dsh-dockkit-float-layer），
   相互叠放 = DOM 顺序（按 tab id 排序、恒定）；raise 只翻 data-dockkit-float-active，
   不重排绘制层 ⇒ 点亮了还压在底下。修法（我们面，零 vendor 改动）：
   激活浮窗的 cell 抬到 62、未激活浮窗 61（均高于基座 60，不碰 vendor 对外变量约定）。
   cell 是 css-module 类不可依赖 ⇒ :has(>) 从子节点 [data-dockkit-float] 锚定；
   div:has(> section[...]) 的特异性 (0,1,2) 盖过 .floatingCell (0,1,0)，与加载顺序无关。 */
div:has(> section[data-dockkit-float]) { z-index: calc(var(--dsh-dockkit-float-layer, 60) + 1); }
div:has(> section[data-dockkit-float-active]) { z-index: calc(var(--dsh-dockkit-float-layer, 60) + 2); }

/* ── 培养主视图（2026-10-28）：第三 tab；左侧培养板 + 右侧自有 composer ─────────
   培养视图激活时隐藏 shell 的全局 composer；右栏 composer 是唯一入口。
   数据属性只在本窗口/本视图挂载期间存在，切到 Chat/Trajectory 即恢复。 */
html[data-dsh-cultivation-view] [data-composer-seat] { display: none !important; }
.wk-cult-view {
  display: flex;
  flex-direction: column;
  /* 会话 scrollBody 在 active phase 是 flex:1 0 auto（内容驱动高度）；培养页要
     左右各自滚动、composer 钉在右栏底，所以按窗口给一个稳定高度。 */
  height: calc(100dvh - 76px);
  max-height: calc(100dvh - 76px);
  min-height: 0;
  width: 100%;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
}
.wk-cult-view-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.wk-cult-view-eyebrow { color: var(--dsw-alias-label-tertiary); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
.wk-cult-view-title { font-size: 18px; font-weight: 650; margin-top: 3px; }
.wk-cult-view-sub { color: var(--dsw-alias-label-secondary); font-size: 12px; margin-top: 3px; }
.wk-cult-overview {
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  border-radius: 7px;
  padding: 6px 10px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.wk-cult-overview:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.wk-cult-view-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 390px);
  flex: 1;
  min-height: 0;
}
.wk-cult-view-board { min-height: 0; overflow: auto; padding: 14px 18px 24px; }
.wk-cult-chat {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.wk-cult-chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 12px 9px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.wk-cult-chat-title { font-size: 12.5px; font-weight: 650; }
.wk-cult-chat-sub { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; margin-top: 2px; }
.wk-cult-chat-badge { color: var(--dsw-alias-label-tertiary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 99px; padding: 2px 6px; font-size: 9px; white-space: nowrap; }
.wk-cult-chat-hint { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; line-height: 1.5; padding: 8px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.wk-cult-chat-hint code { color: var(--dsw-alias-label-secondary); font-size: 10px; }
.wk-cult-chat-state { padding: 12px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; line-height: 1.5; }
.wk-cult-chat-state.bad { color: var(--dsw-alias-state-error-primary); }
.wk-cult-chat-status { color: var(--dsw-alias-label-tertiary); font-size: 9.5px; padding: 2px 2px 0; }
.wk-cult-chat-error { color: var(--dsw-alias-state-error-primary); font-size: 10px; line-height: 1.5; }
.wk-cult-chat-lines { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
.wk-cult-chat-empty { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.6; border: 1px dashed var(--dsw-alias-border-l1); border-radius: 8px; padding: 10px; }
.wk-cult-chat-empty b { display: block; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.wk-cult-chat-empty span { display: block; margin: 3px 0 7px; }
.wk-cult-chat-empty code { display: block; color: var(--dsw-alias-label-secondary); font-size: 10px; overflow-wrap: anywhere; }
.wk-cult-chat-line { display: flex; flex-direction: column; gap: 3px; }
.wk-cult-chat-line.you { align-items: flex-end; }
.wk-cult-chat-who { color: var(--dsw-alias-label-tertiary); font-size: 9.5px; }
.wk-cult-chat-bubble {
  max-width: 92%;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.wk-cult-chat-line.you .wk-cult-chat-bubble { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.wk-cult-chat-bubble.bad { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.wk-cult-chat-composer { border-top: 1px solid var(--dsw-alias-border-l1); padding: 9px 10px 10px; }
.wk-cult-chat-composer textarea {
  width: 100%;
  resize: vertical;
  min-height: 54px;
  max-height: 130px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  padding: 7px 8px;
  font: inherit;
  font-size: 11px;
  line-height: 1.5;
}
.wk-cult-chat-composer textarea:focus { outline: 1px solid var(--dsw-alias-border-l1); }
.wk-cult-chat-actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.wk-cult-chat-session { color: var(--dsw-alias-label-tertiary); font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wk-cult-chat-send { margin-left: auto; border: 0; border-radius: 6px; background: var(--dsw-alias-brand-primary); color: #16111f; font-size: 10.5px; padding: 5px 10px; cursor: pointer; }
.wk-cult-chat-send:disabled { opacity: .45; cursor: default; }
@media (max-width: 1180px) {
  .wk-cult-view-split { grid-template-columns: minmax(0, 1fr) 320px; }
}
`


/**
 * 注入本次挂载拥有的样式表；非浏览器环境返回空清理函数。
 * @returns 只移除本次注入节点的 disposer，交由 ctx.effect 管理。
 */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const style = document.createElement('style')
  style.dataset.companyPack = 'styles'
  style.textContent = CSS
  document.head.append(style)
  return () => style.remove()
}
