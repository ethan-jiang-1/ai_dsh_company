---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-402：Light 主题下 `--dsw-alias-bg-layer-2` 与底色同为纯白致高亮/轨道零对比度，且 `390px` 窄窗培养输入框缺 `border-box` 右侧溢出裁切

> 严重级别：P1（视觉可达性与窄屏布局故障：Light 主题下成品跳转高亮行、策略报错框、命令提示胶囊、用量进度轨道计算色与背景同为 `#fff` 完全隐身；`390×844` 下 `.wk-cultivation-body-input` 右侧溢出父容器 `+18px` 被裁切）｜发现：2026-11-27｜状态：已修（`aa8d8cc3`）｜审查：独立只读盲审通过（0 阻断）；去向 = [批次Note](../../../notes/implemented/2026-11-27-ux-ui-round3-batch-fixes.md)

## 症状

1. **Light 模式白底白块零对比度**（Chromium 实测 `P2_light_mode_layer2_collides_with_base` + 截图 `r3-02-light-mode-contrast.png`）：
   - 上游 [design-platform.css](../../../vendor/dsh/packages/client/ui-theme/src/styles/design-platform.css#L167-L173) 在浅色主题把 `--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1`、`--dsw-alias-bg-layer-2`、`--dsw-alias-bg-layer-3` 全部定义为 `--dsw-static-neutral-bluish-00`（`#ffffff`）；
   - 我方 [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts#L603-L617,L756) 使用 `--dsw-alias-bg-layer-2` 作为 `.wk-command-scope-hint`、`.wk-deliverable-row[data-highlighted='true']`（「核对草稿」跳转定位高亮行）、`.wk-bar` 与 `.wk-strategy-error` 的背景色，Chromium 实测计算值为 **`highlightedBg: rgb(255, 255, 255)`、`lightStrat.bg: rgb(255, 255, 255)`、`layer2Var === bgBaseVar === #fff`**，浅色模式下高亮底色与父底完全融为一体，用户点「核对草稿」跳转后无法辨识哪一行被高亮；
2. **`390×844` 窄窗 `.wk-cultivation-body-input` 右侧溢出 `+18px`**（Chromium 实测 `S3_390_textarea_border_box_and_card_overflow` + 截图 `r3-05-390-overflow.png`）：
   - [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts#L386-L395) 给 `.wk-cultivation-body-input` 设了 `width: 100%; padding: 6px 8px; border: 0.5px solid ...`，但未设 `box-sizing: border-box`；
   - Chromium 实测 `boxSizing: "content-box"`、`taRight: 396`、`parentRight: 378`（超出右边框 `diff: 18px`），两个 `<textarea>` 右侧边框与滚动条直接越界被面板右边缘裁掉。

## 运行面

- **面 = client / CSS**：
  - [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts#L229,L386-L395,L603-L617,L756)（对照只读上游 [design-platform.css](../../../vendor/dsh/packages/client/ui-theme/src/styles/design-platform.css#L167-L210) 可选 `--dsw-alias-bg-module-platform` / `--dsw-alias-interactive-bg-hover` 等浅色可区分令牌）。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit-r3/round3-chromium-audit.mjs
```

- `P2_light_mode_layer2_collides_with_base`：`lightHl={highlightedBg:"rgb(255, 255, 255)", layer2Var:"#fff", bgBaseVar:"#fff"}`；`r3-02-light-mode-contrast.png` 可见「已定位至交付物面板」后 `r3-final` 行无高亮底色；
- `S3_390_textarea_border_box_and_card_overflow`：`textareaOverflow={boxSizing:"content-box", taRight:396, parentRight:378, diff:18}`；`r3-05-390-overflow.png` 可见培养表单两处多行输入框右边框被截出栏外。

## 根因与证据

1. 将 `--dsw-alias-bg-layer-2` 误当作「比 layer-1/base 更深一阶的卡片底色」，未核对上游 Light 模式将该组三层语义映射到了同一 `#ffffff`；
2. `.wk-cultivation-body-input` 设置 `width: 100%` + 左右 `8px` padding + `border` 时遗漏 `box-sizing: border-box`。

## 失败类与同类排查

- **失败类**：浅色主题 token 仅在深色或概念上预设差异未实测 Light computed value；百分比宽度表单控件缺 `border-box`。

## 修复证据

- 改动面：`packages/company-pack/src/client/ui/styles.ts`。
- 红：`pnpm test tests/client/ui/client-css.spec.ts` 中 `styles.ts` 残留 `--dsw-alias-bg-layer-2` 且 `.wk-cultivation-body-input` 缺 `box-sizing: border-box`。
- 绿：`pnpm test tests/client/ui/client-css.spec.ts`（14/14 绿），全套 7 份关联 spec 51/51 绿，`pnpm typecheck`、`pnpm lint`、`pnpm dup` 零错误零违例。
- 提交：commit aa8d8cc3
