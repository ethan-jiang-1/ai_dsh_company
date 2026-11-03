# src/ —— 本包源码面（host 半 + client 半）

> 什么时候读：改 host/client 源码、找注册入口 / 读模型 / 渲染实现时。
**布局**（2026-10-05 按盘核对重写；旧文两处失效指针已修：`routing.ts` 从未存在、`delegation-keys` 实际住 client 半）：

- `index.ts` —— **host 注册入口**（bundle 行 `company-client` 指向它）：`inject = ['tools','approval','commands']`
  声明依赖、`apply(ctx)` 编排签字工具（`request_signoff`）、工作区门投影工具（`workspace_doors`）、培养工具/命令
  （接线在 `host/cultivation.ts`）、公司盘首启自举（接线在 `host/bootstrap.ts`）与成品目录生成/present 投影
  （接线在 `host/catalog.ts`）；公开面只导出 loader 需要的 `apply`/`inject`（0.8.0 收窄，读模型走内部 import）。消费方向 = vendor runtime → 本入口。
- `host/` —— **host-only 逻辑**（用 node 内建，浏览器面不许进）：`bootstrap.ts` 负责公司盘骨架首启自举
  （只补缺 / 不抛 / 可重入）；`catalog.ts` 只留扫描成品 meta/final 与幂等生成
  `kb/deliverables-index.json`（读取/校验 = `catalog-state.ts`，审计账本 = `presented-ledger.ts`）；`cultivation.ts` 负责培养提案工具与人侧 `/cultivation` 命令语义；
  `cultivation-storage.ts` = 存储适配器（路径安全：id 与各目录组件校验、拒 symlink、独占建文件、原子改写），
  注册仍留在入口。
  **为什么单开一层**：`src/lib/` 同时被 client 叶编译（`tsconfig.client.json`），带 node 内建的模块住那儿
  会让 client 叶报 TS2591（2026-10-13 现场）——host-only 的东西住 `host/`。
- `lib/` —— **host/client 共享读模型与纯逻辑**，keyless 单测（`tests/company/`）的直接对象。
  **模块清单 = `src/lib/` 目录本身**（D28：不再手抄枚举；2026-10-20 审计抓到「十一模块」漏
  `deliverables-catalog`，10-21 又抓到消费面句过期——枚举必漂）。已知依赖链 =
  `dag → board → presence`、`presence → presence-status`（`presence` 是 facade）；
  host/client 各消费哪些**以各文件 import 为准**（host 面偏 signoff/doors，client 面占大多数）。
  （client 面另有 `cultivation-actions`＝人侧动作面纯模块：命令线构造 + host 结果折算 + 文案表；
  `CultivationCompose.tsx`＝创作面表单——2026-10-17 培养 GUI 卡）
- `client/` —— **client 注册入口与浏览器面**，顶层只留 `index.ts`（`dsh.client` 注入面及组合），其余按关切分五组
  （2026-11-03 第六轮；每组 = 一个目录，读目录名即知职责）：
  - `wiring/` —— 组合与接线：`context-wiring`（槽上下文）、`company-session-adapters`（Lead 归并 + follow 帧投影）、
    `attention-registry` / `attention-observers`、`member-navigation`、`title-state`、`instance-guard`、`error-ring`、
    **`delegation-keys`（委派键归一，不在 lib/）**。
  - `data/` —— 数据面：`company-data-plane`（路径/读模型常量）、`use-company-data`（订阅生命周期）、`deliverables-index`、
    `workspace-text`、`session-source`。
  - `ui/` —— 共用视觉件：`styles`（CSS 唯一源）、`Brand`、`RoleBadge`、`tab-icons`、`float-geometry`（浮窗几何）、
    `DelegationCard` / `TeamToolCard`（工具卡）。
  - `tabs/` —— 页签面：`company-tabs`（框架/浮出）、`company-panels`（看板/依赖图/在场/用量）、`company-tab-registration`
    （固定页签目录 → 类型/body/title/guide 四处贡献）、四个页签体 + `TasksPanel`。
  - `cultivation/` —— 培养域：`CultivationView` / `CultivationTab` 壳、看板/收件箱/创作/背景选择器、`cultivation-actions|data|context-data`、
    `use-cultivation-board`。
  Cordis 各槽仍各自等待声明并负责卸载/重装；构建走 tsdown client 半（产物 `lib/client.js`）。

**构建**：`tsc -b packages/company-pack` + tsdown 两面（事实家 = [bootstrap](../../../docs/guides/bootstrap.md)）。
⚠ 本目录**不进 tarball**（`files` 的现行清单 = [package.json](../package.json)：只发 runtime 两半、
`presets/**`、`content/**`、`locale/`、`icon.svg`、`cordis.patch.yml`、`LICENSE`，不发 `src/**`（v3 起也没有 `workspace/**`））
——发布面是 `lib/`（generated，owner 表 = [pack README](../README.md)）。
