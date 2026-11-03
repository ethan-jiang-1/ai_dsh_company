# 2026-11-03 · PanelFrame 浮窗接线补测：浮出/收回/几何存档

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D5 R5-06 剩余面）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-06

## 决定

新增 `tests/client/tabs/panel-frame.spec.ts`（happy-dom 真挂 `PanelFrame`）：
① dock 态点「浮出」→ `floatTab('tab-1', 存档几何)`；② 浮窗态（祖先 `[data-dockkit-float]`）点「收回」→
`unfloatTab('pane-9')` 且按 **contentId** 把 `getBoundingClientRect()` 存进 localStorage；
③ 浮窗态显示「收回」而不是「浮出」，标题与刷新文案保持。

## 输掉的方案

- **只测 `float-geometry.ts` 纯函数。** 它已 100%，但“按钮有没有接上 / 收回时存不存”是接线，纯函数测试
  证明不了；审计实测 `company-tabs.tsx` 24.1% 正是这段。
- **用源码文本断言 `captureFloatRect` 存在。** 行为保持的重构会红，接线断了仍绿；本档点真按钮。
- **等真浏览器车道。** `ui-scene-smoke` 不点浮出/收回（`--steps` 可以，但成本分钟级）；keyless 装线
  每次 `pnpm test` 都跑。

## 验证（实跑）

```text
npx vitest run tests/client/tabs/panel-frame.spec.ts
# 3 passed
npx vitest run tests/client/tabs/panel-frame.spec.ts --coverage
# company-tabs.tsx | 53.7 stmt / 34.54 branch（此前 24.1%）
```

红证：未单独制造；三条分别会在“浮出没接 floatTab / 收回没接 unfloatTab / 几何没写 localStorage”时红。
`getBoundingClientRect` 用可写桩返回非零矩形，避开 `width===0` 的“未挂载不采”保护。

## 后果与边界

- 不证明真浏览器拖拽/缩放、平台 `float()` 行为（归 ui-scene-smoke / cdp-probe）。
- 不覆盖其他页签体（Board/Dag/Presence 等），它们的渲染面已有各自 spec；本档只钉共用外框。
