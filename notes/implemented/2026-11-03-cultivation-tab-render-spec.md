# 2026-11-03 · 培养页签补 keyless 渲染判据：0% 的壳不再能空白全绿

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D5）

> 上游 = [第五轮七维打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-06

## 决定

新增 `tests/client/cultivation-tab.spec.ts`（happy-dom + `createRoot` 真挂 `CultivationTab`）：
断言面板外壳与 `data-company-tab-title="培养"`、viewer 角色（`梦之队 CEO`）、“需要我处理”与空态；
再用一条**真实 record 形状**（frontmatter + 正文）断言期望文案出现在面板；最后断言记录目录
`null`（不可达）时给「不可达」而不是折成 0 条空态。

## 输掉的方案

- **只靠 `ui-scene-smoke` 真页面。** 那层是分钟级、不进 `pnpm test`；开发中改页签不会每轮跑，空白回归
  仍可活到呈现前。keyless 渲染判据是秒级、每次 `pnpm test` 都跑。
- **继续用源码文本断言（`toMatch` 打 .tsx）。** 那正是审计抓到的反模式：行为保持的重构会红，行为回归
  只要拼写不变仍绿。
- **给 `CultivationBoard` 再加一层测试。** Board 已有 100% 行覆盖；缺口在**壳**（数据 hook / roleSource /
  PanelFrame 装配），不是 Board 内部。

## 验证（实跑）

```text
npx vitest run tests/client/cultivation-tab.spec.ts
# 3 passed
npx vitest run tests/client/cultivation-tab.spec.ts --coverage
# ...vationTab.tsx | 93.75 stmt / 50 branch / 85.71 func / 90.9 line（此前 0.0%）
```

红证：未单独制造；审计时该文件 0.0% 是实测（v8 coverage），新增 spec 后首次运行即覆盖壳与记录行。
若壳被误删/数据 hook 不再接线，第一条（标题/角色/空态）或第二条（真实记录）会红。

## 后果与边界

- 不证明真浏览器渲染、CSS 布局、浮窗几何（那层归 `ui-scene-smoke` 与 `client-load-smoke`）。
- `company-tabs.tsx` 的浮窗/几何记忆仍是 24.1%，未在本轮补；列为后续 D5 项。
