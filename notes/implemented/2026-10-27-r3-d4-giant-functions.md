---
状态：implemented（2026-10-27，R3 批次 D 收尾：两个巨型流程的首刀）

> **2026-10-28 部分取代（“明确不作”两条）**：R4-E2/E4 与 R4-P3 已拆 `cultivationCommandHandler`
> 与 `CultivationBoard`；本文“等实证再拆”的两条作废。
---

# R3-D 收尾：把「运行前提」和「背景读取」从两个巨型函数里切出来

> 上游 = [第三轮六维度打扫卡](../../_backlog/_archive/settled_issues/2026-10-27-repo-hygiene-round3.md) R3-21；前序 = [D 前半](./2026-10-27-r3-d-first-half-disclosure.md) / [D 后半](./2026-10-27-r3-d-second-half-policy-layer.md)。

## 决定

1. **`apply` 的盘守卫搬进 `host/runtime-guard.ts`**（`prepareCompanyRuntime(ctx)`，144 行）：解析 DSH_HOME/公司盘、
   落点校验、writer lease、读/换 bundle 身份、同 home 多 profile 点名——**逐字搬家**，只把结果收成
   `CompanyRuntime { bundleHome, companyHome, expectedWorkspace, dataBlocked, bundleState, rebound }`。
   `apply` 从 425 行降到 326 行，只做编排。
2. **培养背景读取搬进 `host/cultivation-context-read.ts`**（168 行）：`sessionQueryOf` / `readSessionContext` /
   `readDeliverableContext` / `readContext` 三合一出口；`cultivation.ts` 717 → 568 行。
   这一刀是**文件级**的：命令处理器本身仍 338 行（见下「明确不作」）。

## 明确不作（带理由）

- **`cultivationCommandHandler` 的子命令分发再拆**：它 338 行是 9 个子命令的语义 + 文案，行为密度高；
  拆成 9 个函数只减少单函数行数，不减少读者要理解的状态（`storage` / `scope` / `dataBlocked` / 角色闸）。
  等真出现「改一个子命令要读全文」的实证痛点再拆（D26：行数不是完成门槛）。
- **`CultivationBoard`（483 行）不拆**：它是客户端覆盖最好的面（88.6% 行 / 76.6% 分支，46 个用例），
  482 行里 20+ 个 useState 与派生闭包互相引用；拆子组件要传十余个 handler，收益是行数、风险是行为。
  同理等「改一个区块必须读全文件」的实证再动。

## 输掉的方案

- **把守卫搬进 `apply` 同文件的局部函数**：行数不变，等于没拆；住 `host/` 还能被未来 host spec 直接测。
- **守卫返回隐式全局/闭包**：显式返回 `CompanyRuntime`，后续段落只依赖这六个事实（依赖面可见）。
- **一次性把 `apply` 四个段落全切**：自举/搬家/成品段共享 `bundleState` 与 `ctx.inject` 时序，
  一轮切完无法用现有 keyless 证伪；先切纯前提段。

## 后果

- `apply` 的「先决条件」与「注册编排」分家；后续要加启动期检查只需改 `runtime-guard.ts`。
- `cultivation.ts` 从 717 → 568 行；背景读取的错误文案（「读不到/形状不符」）集中在一个模块。
- 无行为变化：`host-composition`（4）+ `cultivation`（40）+ `apply-rebind`（6）= 50 例全绿。

## 验证（真跑）

```text
pnpm typecheck                              → exit 0
npx vitest run tests/company/host-composition.spec.ts tests/company/cultivation.spec.ts tests/company/apply-rebind.spec.ts
                                            → 3 files / 50 tests passed
npx vitest run                              → 104 files / 947 tests passed
node checks/run-gates.mjs                   → ALL PASS；2 门无对象
```

未验：无浏览器/真模型行为变化；拆分是逐字搬家 + 显式返回，未新增分支。
