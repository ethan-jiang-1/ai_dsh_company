# src/ —— 本包源码面（host 半 + client 半）

**布局**（2026-10-05 按盘核对重写；旧文两处失效指针已修：`routing.ts` 从未存在、`delegation-keys` 实际住 client 半）：

- `index.ts` —— **host 注册入口**（bundle 行 `company-client` 指向它）：`inject = ['tools','approval','commands']`
  声明依赖、`apply(ctx)` 编排签字工具（`request_signoff`）、工作区门投影工具（`workspace_doors`）、培养工具/命令
  （接线在 `host/cultivation.ts`）与公司盘首启自举（接线在 `host/bootstrap.ts`），并再导出共享读模型。
  消费方向 = vendor runtime → 本入口。
- `host/` —— **host-only 逻辑**（用 node 内建，浏览器面不许进）：`bootstrap.ts` 负责公司盘骨架首启自举
  （只补缺 / 不抛 / 可重入）；`cultivation.ts` 负责培养提案工具与人侧 `/cultivation` 命令语义；
  `cultivation-storage.ts` = 存储适配器（路径安全：id 与各目录组件校验、拒 symlink、独占建文件、原子改写），
  注册仍留在入口。
  **为什么单开一层**：`src/lib/` 同时被 client 叶编译（`tsconfig.client.json`），带 node 内建的模块住那儿
  会让 client 叶报 TS2591（2026-10-13 现场）——host-only 的东西住 `host/`。
- `lib/` —— **host/client 共享读模型与纯逻辑**，keyless 单测（`tests/company/`）的直接对象。
  **模块清单 = `src/lib/` 目录本身**（D28：不再手抄枚举；2026-10-20 审计抓到「十一模块」漏
  `deliverables-catalog`）。已知依赖链 = `dag → board → presence`、`presence → presence-status`
  （`presence` 是 facade）；host 入口消费 `signoff / presence / doors`，client 半消费
  `presence / board / budget`（类型为主 + 少量纯函数）。
  （client 面另有 `cultivation-actions`＝人侧动作面纯模块：命令线构造 + host 结果折算 + 文案表；
  `CultivationCompose.tsx`＝创作面表单——2026-10-17 培养 GUI 卡）
- `client/` —— **client 注册入口与浏览器面**：`index.ts`（`dsh.client` 注入面及组合）调用
  `company-session-adapters.ts` 统一 Lead 归并与 follow 帧投影，调用 `company-tab-registration.ts` 以一个固定页签目录
  派生类型、body、title、guide 四处贡献；Cordis 各槽仍各自等待声明并负责卸载/重装。其余是页签组件与视图模型
  （范本 `delegationCardModel`）、`Brand.tsx` 品牌皮肤、`float-geometry.ts` 浮窗几何；**`delegation-keys`（委派键归一）住这里**，不在 lib/。
  构建走 tsdown client 半（产物 `lib/client.js`）。

**构建**：`tsc -b packages/company-pack` + tsdown 两面（事实家 = [bootstrap](../../../docs/guides/bootstrap.md)）。
⚠ 本目录**不进 tarball**（`files` = `lib/**`、`presets/**`、`workspace/**`、`cordis.patch.yml`；
  `workspace/**` = 出厂公司盘骨架，2026-10-13 起随包）——发布面是
`lib/`（generated，owner 表 = [pack README](../README.md)）。
