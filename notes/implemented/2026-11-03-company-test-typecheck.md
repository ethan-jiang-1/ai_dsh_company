# 2026-11-03 · tests/host 进 tsc（`tsconfig.test-company.json`）

状态：implemented（2026-11-03；七维复评 D5 类型面，接 client 面之后）

> 上游 = [tests/client 进 tsc](./2026-11-03-client-test-typecheck.md)。
> company 面起始 97 errors（含 7 个直引 vendor 源码的 spec）；本轮收成绿。

## 决定

- 新增 **`tsconfig.test-company.json`**：
  - 继承 `packages/company-pack/tsconfig.host.json`；
  - `rootDir: "."` / `noEmit` / `allowJs` / `skipLibCheck`；
  - `paths` 打通 `@deepseek-ai/*` 到 pack 的 `node_modules`，三个 session-controller/session 子路径显式指向 `lib/types`；
  - include `tests/host/**` + `tests/support/temp-env.ts` + `tests/support/cultivation-harness.ts`；
  - **排除 7 个直引 vendor 源码 / host-composition 的 spec**：`apply-lifecycle` / `fs-record-sandbox` /
    `cultivation-propose-guards` / `fs-record-write` / `presented-domain-real` / `host-composition` / `catalog`。
- `pnpm typecheck` = pack 两面 + `tsconfig.test-client` + `tsconfig.test-company`；`.githooks/pre-push` 三行同步。
- 为过类型面做的实质修正：
  - `workspace-doors.ts` / `index.ts` 补 `@deepseek-ai/dsh-api-session-controller/types` type import
    （`api-session/*` 事件 augmentation；源侧 9 errors）；
  - 测试 fixtures：`TeamViewLike` 的 `phase`、`TaskRow.description`、`RootSessionFact.agentPreset` 补齐；
  - `readonly` 数组 `.sort()` 改 `[...arr].sort()`；`recordsOf()[0]` / `inboxRows()[0]` 非空；
  - `ctx.commands.register` 的 fake ctx 用 `Context` cast + 局部 `Def` 类型；
  - `warn.mock.calls` 在 vitest 新类型下是 `[][]`，先 `as unknown as Array<[unknown]>`；
  - `CultivationRecord` exactOptional 的夹具用 `as unknown as CultivationRecord`。

## 输掉的方案

- **把 7 个 vendor 直引 spec 也拉进来。** vendor 源码内部类型会污染项目；先排除，等 vendor 导出稳定。
- **把 `strict` 放宽换绿。** 与 client 面口径不一致，且会假绿。
- **只 typecheck 纯 `tests/host` 不包 support。** support 被 company spec 直接 import，不编会漏类型。

## 验证（实跑，2026-11-03 13:1x +08）

```text
tsc -p tsconfig.test-company.json   # 0 errors（起始 97）
pnpm typecheck                      # exit 0（pack + client + company）
pnpm test                           # 139 files / 1108 tests
pnpm verify                         # ALL PASS
```

## 边界

- 覆盖：`tests/host`（除 7 个 vendor 直引/host-composition spec）+ 两个 support 夹具。
- 不覆盖：`tests/harness`（宽松测试代码 + vendor 直引；独立轮）。
- 0.8.6 之后 pack 源码多了 `use-company-data` / `workspace-doors` / `index` 的 type import；
  下次发布需 bump **0.8.7**（运行时不变）。
