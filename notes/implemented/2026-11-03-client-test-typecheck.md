# 2026-11-03 · tests/client 进 tsc（`tsconfig.test-client.json`）

状态：implemented（2026-11-03；七维复评 D5 类型面）

> 上游 = 2026-11-03 fresh 复评 D5「tests 不在任何 tsc 程序」。
> 前几次试法：单项目 527 errors、harness 132、company 97、client 131；本轮把 client 面收成绿。

## 决定

- 新增 **`tsconfig.test-client.json`**：
  - 继承 `packages/company-pack/tsconfig.client.json`；
  - `rootDir: "."` / `noEmit` / `allowJs` / `skipLibCheck`；
  - `typeRoots` 指向 `vendor/dsh/scripts/types` + `vendor/dsh/node_modules/@types` + 根 `@types`；
  - `paths`：`@deepseek-ai/*` → pack 的 `node_modules`、`react`/`react-dom` → vendor `@types`、session-controller/session 的三个子路径显式指向 `lib/types`；
  - include `tests/client/**` + `tests/support/temp-env.ts`；
  - **排除 3 个直引 vendor 源码的 spec**：`company-tab-registration` / `company-client-composition` / `style-lifecycle`。
- `pnpm typecheck` = `tsc -b packages/company-pack && tsc -p tsconfig.test-client.json`；
  `.githooks/pre-push` 同步加第二行。
- 为过类型面做的实质修正：
  - `use-company-data` 补 `agent-team/client` type augmentation（源类型缝 7→0，单独 Note）；
  - `temp-env` 显式回宽 `process.env`（client 面把 env 收窄成 `DSH_CLIENT_*`）；
  - 测试里的 `SessionId` / branded id 用 `as never` 收口，`ring.list()[i]` 加非空断言，fixtures 的 `process.env.X` 回宽，`TaskRow.description` 补字段，`contexts: undefined as never` 保留“旧记录无 contexts”的运行时形状；
  - `company-tabs-body` 组件以 `as never` 传给 `createElement`（组件 props 比 React 默认 `{}` 宽，属测试壳问题）。

## 输掉的方案

- **单 project 包一切 tests。** host/client Context 双增强冲突 + vendor 源码直引，527 errors 不可维护。
- **放宽 `strict` 换绿。** 会得到“绿但没判据”的假绿；本轮保持 client base 的 strict。
- **为了 3 个 vendor-src spec 把 vendor 源码拉进项目。** 会把 vendor 内部类型错误带进来；先排除，等 vendor 导出稳定再收。

## 验证（实跑，2026-11-03 12:4x +08）

```text
node ./node_modules/typescript/bin/tsc -p tsconfig.test-client.json   # 0 errors（起始 131）
pnpm typecheck                                                        # exit 0（pack + client tests）
pnpm test                                                             # 139 files / 1107 tests
pnpm verify                                                           # ALL PASS
```

## 边界

- 覆盖：`tests/client`（除 3 个 vendor-src spec）+ `tests/support/temp-env.ts`。
- 不覆盖：`tests/company` / `tests/harness`（vendor 源码直引 + 宽松测试代码；另轮）。
- `tsconfig.test-client.json` 是 tracked 配置；改 client 测试签名/导入面时 `pnpm typecheck` 会先红。
