---
状态：implemented（2026-10-27，R3 批次 C 前半：客户端/host 回归网 + 日志与探针真值）
---

# R3-C（前半）：把用户实际接触面的回归网补上，并让日志/探针不再假绿

> 上游 = [第三轮六维度打扫卡](../../../_backlog/_archive/settled_issues/2026-10-27-repo-hygiene-round3.md)
> （R3-02/03 的探针面、R3-10/11/12/23）。后半（合成 web 场景 + `--ui`、客户端错误通道、真空绿门禁）另篇。

## 决定

1. **待办链路拆出可测的观察者模块**：`client/attention-observers.ts`（从 `client/index.ts` 的 `ctx.inject`
   内联块抽出）。真契约三条：只登记不接管（永远 `next()` 委托）、按发起会话登记、`next()` 结算后销账
   （含抛错）。入口处把 vendor 服务面**窄化**成 `$on` + `scopeOf` 并注明理由。
2. **客户端三档新 spec**：`attention-tab.spec.ts`（happy-dom 真挂载：空态/挂起项/「去处理」跳转/断流错误行）、
   `attention-observers.spec.ts`（5 例：登记、委托、销账、无主不登记、缺字段占位）、
   `company-panels.spec.ts`（在场/用量两面板首次有渲染断言：空态、行、Lead 标记、份额、缺数据显示破折号）。
3. **Host 真实组合 spec**（`tests/company/host-composition.spec.ts`）：真 `Context` + 假 services 跑 `apply()`，
   断言注册面固定（`request_signoff` / `workspace_doors` / `cultivation_propose` + `deliverables` / `cultivation`）、
   `dispose` 摘净、无 agent 时签字工具回 `unavailable` 且不发审批、schema 必填键可判。
4. **propose 五条治理守卫表驱动 spec**（8 例）：无会话 / 不在名册 / 跨角色 correction / suggestion 给自己 /
   非法 kind / cwd 不在盘根 / bundle 损坏（dataBlocked）/ 正常对照；每条拒绝都断言**没有落记录文件**。
5. **`diagnose` 不再把中断轮当健康**：新增 `interruptedTurns`（有 `turn/start` 无 `turn/end`）与 `toolCalls`
   计数；文本输出 `interrupted=N` / `TOOLS …`；`--strict` 有失败即 exit 1（默认 0 保持兼容）。
6. **`cdp-probe` 区分环境未就绪**：页面停在登录/凭据引导时 exit 2 + `reason: not-onboarded`（不再报成渲染失败）；
   `--evidence` 让成功也落 verdict/截图（原来只有失败留证）；头注选择器名与代码对齐。

## 输掉的方案

- **只给 AttentionTab 做 SSR 断言**：SSR 不跑 effect，挂起项/断流/点击都测不到；选 happy-dom + createRoot。
- **直接测 propose 的内部函数**：五条守卫不是导出函数，测内部就得改结构或复制判据；选经真实注册工具调用
  （同时覆盖注册 + schema + 守卫）。
- **`diagnose --strict` 设为默认**：现有脚本/人习惯把它当只读摘要，默认非零会打断链式命令；选 opt-in。
- **把「未登录」当断言失败（exit 1）**：错误归因会把 agent 引向查 client 代码；选 exit 2（环境未就绪），
  与脚本退出码约定一致。
- **在 `client/index.ts` 里保留内联观察者、用 mock remote 测入口**：入口还依赖一堆别的服务；抽成纯注册函数
  是唯一能 keyless 测的形状。

## 后果

- `pnpm test` 97 → **103 spec / 910 → 944 用例**；`host/index.ts` 与 `client/index.ts` 的未覆盖函数进入覆盖。
- 待办面板/观察者/两面板从「零渲染断言」变成有回归网；`cultivation_propose` 的五条拒绝理由有测试钉住。
- `diagnose` 对「进程被杀/崩溃」的会话不再输出 `FAILURES none`；需要门禁语义时用 `--strict`。
- `cdp-probe` 在未配凭据的 home 上不再伪装成坏页面，并可在成功时留证据。

## 验证（真跑）

```text
npx vitest run tests/client/attention-tab.spec.ts            → 5 passed
npx vitest run tests/client/attention-observers.spec.ts      → 5 passed
npx vitest run tests/client/company-panels.spec.ts           → 5 passed
npx vitest run tests/company/host-composition.spec.ts        → 4 passed
npx vitest run tests/company/cultivation-propose-guards.spec.ts → 8 passed
npx vitest run tests/harness/session-diagnose.spec.ts        → 8 passed（新增中断轮/工具计数 2 例）
npx vitest run                                               → 103 files / 944 tests passed
node checks/run-gates.mjs                                    → verify: ALL PASS
pnpm typecheck                                               → exit 0
```

红→绿留证（spec 先在实现缺口上红，再修出绿）：

```text
# host-composition 的 dispose 断言首跑红：服务桩的 register 没走 cordis effect，dispose 后 3 个工具仍在
expected 3 to be +0 → 桩改为 ctx.effect(() => () => delete) 后绿
# 同文件 schema 断言首跑红：defineTool 把 parameters 编成 {type,required,properties}
expected [detail,line,summary] to equal [properties,required,type] → 改断言为 schema 形状后绿
```

未验：真浏览器/真模型未跑（本批为 keyless 面）；客户端错误通道与合成 web 场景属 C 后半。
