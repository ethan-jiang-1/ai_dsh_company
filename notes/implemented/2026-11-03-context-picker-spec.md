# 2026-11-03 · 背景选择面板补 keyless 判据：三组候选/搜索/点选/取消

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D5 R5-27）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-27

## 决定

新增 `tests/client/cultivation/cultivation-context-picker.spec.ts`（happy-dom 真挂 `CultivationContextPicker`）：
① 渲染三组候选（本次会话 / 最近会话 / 最近成品）与隐私说明；② 点候选项回传 `{kind:'session',row}`；
③ 搜索过滤会话与成品（`alpha` 命中、`zzz-no-match` 空态）；④ Escape 调 `onCancel`。

## 输掉的方案

- **只测纯 `matches`。** 它没导出，且过滤只是面板的一小段；三组候选、点选、取消都是接线。
- **等 `ui-scene-smoke` 真页面。** 那层是分钟级、不进 `pnpm test`；背景选择器空白/过滤失效会活到呈现前。
- **用源码文本断言 `onPick` 出现。** 行为保持的重构会红、接线断了仍绿。

## 验证（实跑）

```text
npx vitest run tests/client/cultivation/cultivation-context-picker.spec.ts
# 4 passed
npx vitest run tests/client/cultivation/cultivation-context-picker.spec.ts --coverage
# ...extPicker.tsx | 69.35 stmt / 61.22 branch（此前 56.5% / 0 分支）
```

红证：未单独制造；四条分别会在“候选不渲染 / 点选不回调 / 搜索不过滤 / Escape 不取消”时红。

## 后果与边界

- 不证明真浏览器键盘 ↑/↓ 焦点移动、滚动与视觉布局（归 ui-scene-smoke / 真页面走查）。
- 预览读取（`readPreview`）未在本档触发；它属于选中后的下一步，由 `CultivationCompose` 侧覆盖。
