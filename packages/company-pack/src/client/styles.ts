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
