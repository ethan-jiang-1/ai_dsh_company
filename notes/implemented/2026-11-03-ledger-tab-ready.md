# 2026-11-03 · 台账页签 ready 路径补渲染；删两条 parser 源码断言

状态：implemented（2026-11-03；用户授权「打扫卫生 + 持续改善」；D5 R5-09）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 审计 = [第五轮七维审计](../../_backlog/_archive/research/repo-hygiene-round5/2026-11-03-seven-dimension-audit.md) R5-09

## 决定

新增 `tests/client/tabs/ledger-tab.spec.ts`（happy-dom 真挂 `LedgerTab`）：喂一段合法台账，断言统计
「共 1 场动议 / 成品 1」、行 slug、`日期 · 类型 · 参与`、结论与成品标记；另一例喂 `null` 断言
「台账不可读」。随后删掉 `client-face.spec.ts` 里「源码出现 `parseMotionLedger` / `parseCatalog`」
两条断言——行为已由真渲染覆盖，`parseMotionLedger` 本身另有 `tests/company/ledger.spec.ts`。

## 输掉的方案

- **保留源码断言。** 改组件结构会红，解析断了但源码里仍有字符串时仍绿。
- **只靠 `parseMotionLedger` 单测。** 解析正确 ≠ 页签把结果显示出来；本档补的是后者。
- **只靠 `panel-freshness` 的 LedgerTab 渲染。** 那例喂 `readLedger: null`，只覆盖不可读态，不覆盖 ready 行。

## 验证（实跑）

```text
npx vitest run tests/client/tabs/ledger-tab.spec.ts tests/client/wiring/client-face.spec.ts
# 2 files / 7 tests passed（ledger-tab 2 + client-face 5）
```

红证：未单独制造；若 `LedgerTab` 不调用 `parseMotionLedger` 或统计/行不渲染，第一条会红。

## 后果与边界

- 不证明真文件读取/30s 轮询（`useWorkspaceText` 时序归真页面）；只钉 ready/不可读两态的渲染。
- `client-face.spec.ts` 仍保留数据面路径/limit 断言与 `tool.call.toolview` 优先级断言（那些是装配/冲突面）。
