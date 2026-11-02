# 2026-11-03 · 台账长摘要的源码断言改行为断言

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D5 R5-09）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-09

## 决定

新增 `tests/client/ledger-summary-interaction.spec.ts`（happy-dom 真挂 `LedgerSummary`；**不改**已有的 `ledger-summary.spec.ts` 5 例静态渲染规格）：长摘要出现「全文」入口、
点开后变「收起」、`aria-expanded` 与 `is-expanded` 类同步；短摘要未裁切时不给入口。
同时把 `client-face.spec.ts` 里“长摘要必须有全文入口”的 **7 条源码正则**收成 **2 条样式断言**
（`-webkit-line-clamp` 存在；不给 `.wk-row-summary:not(` 开免裁口子）。

## 输掉的方案

- **保留源码正则。** 行为保持的重构（改组件结构、换状态实现）会红；行为回归只要拼写不变仍绿。
- **只做静态渲染断言。** 能证明入口在，不能证明“点了会展开/收起”；本档点真按钮。
- **上真浏览器。** `scrollHeight/clientHeight` 的裁切判定确实只有真布局能证，但“入口存在 + 点击状态机”
  是 keyless 能证的；真布局留给 ui-scene-smoke / 人工走查。

## 验证（实跑）

```text
npx vitest run tests/client/ledger-summary.spec.ts tests/client/ledger-summary-interaction.spec.ts tests/client/client-face.spec.ts
# 3 files / 12 tests passed（静态 5 + 交互 2 + client-face 5）
```

红证：未单独制造；若 `LedgerSummary` 的 `onClick` 断开或 `aria-expanded` 不随状态，第一条会红。
`ResizeObserver` 在 happy-dom 里用 no-op 桩（组件用它量溢出；短摘要路径不依赖它）。

## 后果与边界

- 不证明真实两行裁切/行高（`scrollHeight > clientHeight`）；CSS 两行边界仍由样式断言守。
- `client-face.spec.ts` 仍保留 `tool.call.toolview` 优先级与数据面常量等源码断言（那些是装配/冲突面，
  见文件内“只能靠源码钉”的注释）。
