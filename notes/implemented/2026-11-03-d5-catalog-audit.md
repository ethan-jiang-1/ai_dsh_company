# 2026-11-03 · D5：catalog 审计路径补测（抓到 v3 slug bug）+ Picker problem 态 + mock 表述对齐

状态：implemented（2026-11-03；A- D5 收尾）

> 上游 = [第五轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md)
> 评分 GAP：`host/catalog.ts` 55.8–58.9%；Picker 70.96%；`docs/testing.md` 的 mock 白名单与实际不符。

## 决定

1. `catalog.spec.ts` 补 `auditRelPath`（合法交付物/绝对路径/meta/穿越/外部）与 `setPresentedAudit`
   （true 写 path+slug、false 只认 path、坏账本不覆盖）两例。**测试抓到真 bug**：v3 路径下
   `setPresentedAudit` 用 `rel.split('/')[1]` 取 slug，实际取到字面 `deliverables`，presented=true 的
   slug 永远写错；改为取 `final.md` 的父目录并剥日期前缀。
2. Picker 补“成品目录不可达 → 显示 problem”一例；branch 40.81→65.3。
3. `docs/testing.md` 的 mock 白名单改为“模块 mock 两处；参数注入式假件不算模块 mock，spec 自述边界”
   ——`probe-web.spec` 的 spawn/fetch 是参数注入，不是未登记模块 mock。

## 输掉的方案

- **只给 catalog 加行数覆盖、不测审计路径。** 正是这次测试抓出 v3 slug bug；不测就继续把
  presented=true 的 slug 写成 `deliverables`。
- **把 `setPresentedAudit` 的 slug 逻辑留在旧 v2 假设。** 与 `.dsh-company/deliverables` 迁移不一致。
- **把 probe-web 的注入假件登记成“模块 mock”。** 会混淆“替换模块”和“参数注入”，白名单失去判据意义。

## 验证（实跑）

```text
npx vitest run tests/company/catalog.spec.ts
# 15 passed（新增 2 例；修复 slug 后绿）
npx vitest run tests/client/cultivation/cultivation-context-picker.spec.ts
# 5 passed（新增 problem 态）
npx vitest run tests/company/catalog.spec.ts --coverage
# catalog.ts | 76.29 stmt / 62.98 branch（此前 55.84/41.98）
pnpm test
# 134 files / 1076 tests（0 skipped）
```

红证：新增 `setPresentedAudit` 用例在修复前 `slugs.alpha` 为 `undefined`（实收 `deliverables`），
修复后为 true；`auditRelPath` 的 meta/穿越/外部三例均为拒绝分支。

## 后果与边界

- catalog.ts 仍有 `presentedFromSessions` 的失败计数、`presentedFromLegacyCatalog` 等未覆盖分支；
  76.29% 是 A- 门槛内的“主路径 + 审计路径”证据，不是全函数覆盖。
- presets 真挂载仍只在 `preset-smoke`（认证档，不进 `pnpm test`）；keyless 层守声明形状/内容。
