/**
 * 本包 client 面的样式表：挂载时一次性注入 `<style>`（幂等）。
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

/** 注入点 id：同 id 只插一次（幂等；重复 apply 不会重复插）。 */
const STYLE_ID = 'dsh-company-pack/client-styles'

/** 本包 client 面的样式：S1 视图类名、S2 皮肤类名、S3 动效 keyframes 都加在这里。 */
const CSS = `
:root {
  /* 公司视图的布局旋钮（本包私有；颜色不在此声明，一律用 --dsw-* 令牌） */
  --wk-board-column-min: 13rem;
  --wk-row-gap: 0.35rem;
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
.wk-row-task {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.wk-activity { margin: 4px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.wk-activity li { margin: 2px 0; }

/* 用量 */
.wk-usage-total { font-size: 20px; font-variant-numeric: tabular-nums; }
.wk-usage-row { margin: 8px 0; max-width: 32rem; }
.wk-usage-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.wk-bar { height: 6px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; margin-top: 4px; }
.wk-bar-fill { height: 100%; background: var(--dsw-alias-state-business-primary); }

/* DAG */
.wk-dag-node { display: flex; align-items: flex-start; gap: 5px; }
.wk-dag-node-title {
  font-size: 11px;
  line-height: 1.3;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

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
.wk-table td[data-col='owner'], .wk-table td[data-col='blocked'] { white-space: nowrap; }
.wk-cell-id { color: var(--dsw-alias-label-tertiary); font-size: 12px; font-variant-numeric: tabular-nums; }

/* 右栏驾驶舱（Company 页签）：在场板 + 动态流 */
.wk-pane { padding: 8px 12px; font-size: 13px; line-height: 1.5; text-align: left; color: var(--dsw-alias-label-primary); }
.wk-pane-head { display: flex; align-items: baseline; gap: 8px; }
.wk-list { display: grid; gap: 4px; }
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

@media (prefers-reduced-motion: reduce) {
  /* 动效层（S3）的过渡/动画在此统一关闭——先立规矩，S3 加 keyframes 时自动被覆盖 */
  .wk-motion {
    transition: none !important;
    animation: none !important;
  }
}
`

/**
 * 注入本包样式表（幂等；非浏览器环境静默跳过）。
 * @returns 无。
 */
export function installStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
}
