# src/ —— 本包源码面（host 半 + client 半）

**布局**（2026-10-05 按盘核对重写；旧文两处失效指针已修：`routing.ts` 从未存在、`delegation-keys` 实际住 client 半）：

- `index.ts` —— **host 注册入口**（bundle 行 `company-client` 指向它）：`inject = ['tools','approval']`
  声明依赖、`apply(ctx)` 注册 host 工具（`request_signoff` 活范本 + `workspace_doors` 门控工具，
  2026-10-06 BUG-002 修复落地）、`export * from './lib/presence.ts'` 等再导出读模型。
  消费方向 = vendor runtime → 本入口。
- `lib/` —— **host/client 共享读模型与纯逻辑**，keyless 单测（`tests/company/` 11 spec）的直接对象：
  `attention / board / budget / cultivation / dag / doors / ledger / presence / signoff / tool-card` 十模块
  （`doors` = 多人门控归属判据，2026-10-06 加入）。内部依赖链一条：`dag → board → presence`
  （2026-10-05 盘点）。host 入口消费 `signoff / presence / doors`；
  client 半消费 `presence / board / budget`（类型为主 + 少量纯函数）。
- `client/` —— **client 注册入口与浏览器面**：`index.ts`（`dsh.client` 注入面：UI 依赖 inject +
  sidebarRightTabs / COMPANY_VIEW_ID 页签注册）、页签组件与视图模型（范本 `delegationCardModel`）、
  `Brand.tsx` 品牌皮肤、`float-geometry.ts` 浮窗几何；**`delegation-keys`（委派键归一）住这里**，不在 lib/。
  构建走 tsdown client 半（产物 `lib/client.js`）。

**构建**：`tsc -b packages/company-pack` + tsdown 两面（事实家 = [bootstrap](../../../docs/guides/bootstrap.md)）。
⚠ 本目录**不进 tarball**（`files` 只含 `lib/**`、`presets/**`、`cordis.patch.yml`）——发布面是
`lib/`（generated，owner 表 = [pack README](../README.md)）。
