# Client whole-client 组合档进入 keyless 树

状态：implemented（2026-10-16；授权 = 用户四选一后续轮的 D 项：「引入 client-test-runtime，真组合测 client apply 的挂载/卸载/重载」。此前该证据缺口在 [2026-10-15-cultivation-host-safety](./2026-10-15-cultivation-host-safety.md) 如实挂起。）

## 决定

[tests/client/company-client-composition.spec.ts](../../tests/client/company-client-composition.spec.ts) 用 vendor
`@deepseek-ai/dsh-client-test-runtime` 的 whole-client 档（生产 `bootClient` + 真模块系统 + RemoteMock 只替网络端点）组合
本包 client 行，断言真实 `apply` 的三面：八页签类型 + 三组 keyed 槽、`startInstanceGuard` 心跳、fiber 卸载后的全量清除与重载后的复原。

三条接线决定：

1. **roster 组合**：`bundleRoster([...WEB_PROFILE_BUNDLES, 'dsh-company-pack'], undefined, profileContext 求值面).closure(['dsh-company-pack'])`
   ——与 profile 启动器同一套 bundle patch 组合；本包行经 tier 的 `provide` 从**源码面**供给（`src/client/index.ts` 直导入）。
2. **vitest 别名基建**：根 [vitest.config.ts](../../vitest.config.ts) 把 `vendor/dsh/tsconfig.base.json` 加为 tsconfigPaths 原生项目
   ——extends 链继承的 paths 在本仓根解析时基址错位（`@deepseek-ai/dsh-client-modules/client` 实测解析出 `packages/packages`
   翻倍路径并落到构建产物 lib），原生项目让同一份映射以 vendor 根为基址正确落 src。
3. **`remote.workspaceFiles` 命名空间**：tier 丢掉 api-remotes 行后按「模块 inject 声明 + mock 端点前缀」推导命名空间；真实组合里
   `remote.workspaceFiles` 由 api-remotes 生成客户端提供，闭包内无模块声明它 ⇒ spec 在 boot 前给 mock 挂一条
   `workspaceFiles/read` 规则让命名空间在场（注册面本身不调用该端点）。

## 输掉的方案

- **动态 import 走 exports（构建产物）**：`dsh-company-pack/client` 落到 tsdown 的 CJS bundle，模块初始化即炸；且违背根仓
  「vitest 一律走 src 源码面」纪律（第二模块单例）。改走 provide 源码模块。
- **根 tsconfig 加 paths 修别名**：TS extends 对 `paths` 是整体覆盖不是合并——加了就会抹掉继承的全部 `@deepseek-ai/*` 映射；
  改在 vitest 插件层把 vendor base 列为第二个原生项目。
- **给 pack manifest 补 `@deepseek-ai/dsh-api-workspace-files` 依赖边**：被否——真实浏览器组合里 `remote.workspaceFiles` 的
  provider 是已声明的 api-remotes；缺面出在 tier 的推导（丢了 api-remotes 行），不在 manifest，改在 spec 侧声明端点。

## 后果与覆盖边界

- client `apply` 组合 + fiber 卸载/重载进 keyless 树（60 spec/559 用例之一）；真浏览器渲染交互仍归 client-load-smoke 与
  replay `--ui`（分层不变）。守卫 `ctx.effect` 接线由此获得整 fiber 生命周期的机器判据（2026-10-15 修复的收口证据）。
- 限制：spec 用 happy-dom（根仓无 jsdom）；tier 的 RemoteMock 只替网络端点，生成 Remote codec 面不在此档（vendor tier 设计如此）。

## 验证（实际执行）

| 命令 / 试验 | 断言 | 红 / 绿形态 |
|---|---|---|
| `pnpm exec vitest run tests/client/company-client-composition.spec.ts` | boot/卸载/重载三用例 | 3/3 PASS（接线调试期红过三形态：别名翻倍落 lib、`WEB_PROFILE_BUNDLES` 桶导出缺失、命名空间缺导致页签空注册——均已修复并记录于上） |
| 临时把 `ctx.effect(() => startInstanceGuard(document))` 还原为裸调用后重跑 | 丢弃 disposer 的旧缺陷能否被此档抓住 | 红：卸载用例 `expected ['tab-…','tab-…'] to deeply equal []`（泄漏心跳）、重载用例 4 条心跳 ≠ 1；还原后绿 3/3 |
| `set -o pipefail && pnpm verify && pnpm test` | 全门禁 + 全量 keyless | verify ALL PASS；60 文件 / 559 测试 PASS |

## 指针

- 挂起项的原文与守卫修复：[2026-10-15-cultivation-host-safety](./2026-10-15-cultivation-host-safety.md)
- 测试分区与分层：[tests README](../../tests/README.md)
- tier 本体（vendor，只读）：`vendor/dsh/packages/test-support/client-runtime/src/assembly/`
