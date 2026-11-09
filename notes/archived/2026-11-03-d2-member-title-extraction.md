# 2026-11-03 · D2/D5：openMember 与标题状态抽出并直测

状态：implemented（2026-11-03；七维复评 Phase 2 续）

> 上游 = [context-wiring 抽出](./2026-11-03-d2-context-wiring-extraction.md) 的同一批 D2/D5 残余：
> `client/index.ts` 的 `openMember` / `registerTitle` 仍藏在 inject 闭包里。

## 决定

- **`makeOpenMember`** 移入 `client/member-navigation.ts`：lead 直接开；teammate 只在
  `retainedBy.mainView > 0` 时 `refresh()` 后按 continuable child 打开。4 例直测：
  lead / teammate 未 retain / retain / refresh 失败。
- **`titleUpdateFor`** 移入 `client/title-state.ts`：把「找当前会话 → preset 短名 → 标题/角色」折成纯函数；
  `registerTitle` 只负责 `document.title` 与 `:root[data-wk-role]` 的写入/删除。5 例直测：
  无当前会话 / ceo / 未知 preset / 空标题 / preset=null。
- `client/index.ts` 只留注册与 inject 编排；`SessionId` 的不必要 import 一并清掉。

## 输掉的方案

- **保留闭包、只加 whole-client 断言。** 每次起真 Cordis 组合，失败定位差；纯工厂 + 注入面毫秒级。
- **把 `registerTitle` 的 DOM 写入也塞进纯函数。** DOM/订阅是副作用的边界，纯函数只算值；否则测试要造 document。
- **现在给 client/index 设 branch 阈值。** 16.66% 仍低，剩余是注册/装配分支；先抽到可测单元再设棘轮，避免把低值钉死。

## 验证（实跑，2026-11-03 11:2x +08）

```text
npx vitest run tests/client/wiring/member-navigation.spec.ts tests/client/wiring/title-state.spec.ts  # 9 passed
pnpm test                                                                                # 138 files / 1101 tests
pnpm verify                                                                              # ALL PASS
npx vitest run --coverage --coverage.reporter=json-summary
# member-navigation.ts: 100 stmt / 83.33 branch
# title-state.ts:       100 stmt / 93.75 branch
# context-wiring.ts:     95 stmt / 93.33 branch
# client/index.ts:       73.11 stmt / 16.66 branch（余下为注册/装配）
```

## 余项

- `client/index.ts` 仍是注册编排面；下一步若要再降 branch 噪声，优先拆 `registerTitle` 的 effect 或
  `registerCompanyTabsWiring` 的依赖清单，而不是硬测 slot 注册。
- `host/catalog.ts` 的 presented-ledger 拆分仍待做（D2 P3）。
