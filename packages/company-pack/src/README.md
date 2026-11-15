# src/ —— 本包源码面（host 半 + client 半）

> 什么时候读：改 host/client 源码、找注册入口 / 读模型 / 渲染实现时。
**布局**（2026-11-11 按盘重校；host 组路径以 [host/README](./host/README.md) 为准）：

- `index.ts` —— **host 注册入口**（bundle 行 `company-client` 指向它）：`inject = ['tools','approval','commands','workspaceRegistry']`
  声明依赖、`apply(ctx)` 编排签字工具（`request_signoff`）、工作区门投影工具（`workspace_doors`）、培养工具/命令
  （接线在 `host/cultivation/cultivation.ts`）、公司盘首启自举（接线在 `host/run-bundle/bootstrap.ts`）与成品目录生成/present 投影
  （接线在 `host/ledger/catalog.ts`）；公开面只导出 loader 需要的 `apply`/`inject`（0.8.0 收窄，读模型走内部 import）。消费方向 = vendor runtime → 本入口。
- `host/` —— **host-only 逻辑**（用 node 内建，浏览器面不许进），按关切分目录，**组清单 = `host/` 目录本身**
  （D28：不抄计数——本行曾写「9 组」而盘上 11 个目录；组地图与每组职责 = [host/README](./host/README.md)）。
  公开入口 = `index.ts`。
  **为什么单开一层**：`src/lib/` 同时被 client 叶编译（`tsconfig.client.json`），带 node 内建的模块住那儿
  会让 client 叶报 TS2591（2026-10-13 现场）——host-only 的东西住 `host/`。
- `lib/` —— **host/client 共享读模型与纯逻辑**，按域分八组，**组清单 = `src/lib/` 目录本身**
  （D28：不抄枚举——本行曾写「十一模块」漏 `deliverables-catalog`）：presence（在场/看板/依赖图/工卡/门投影）·
  cultivation（培养）· docs（PRD、需求、文档形状、YAML）· deliverables（成品目录与地址）· delegation（委派能力/面/树/重试）·
  startup（启动策略）· accounting（账本/预算/签署）· shared（跨域叶子：不随单一域而变的小件，准入 = 删除后复杂度散回 ≥2 个域）。
  `tests/lib/` 与这八组同名对应，镜像由 [mirror.spec.ts](../../../tests/repo/structure/mirror.spec.ts) 的断言守；
  已知依赖链 = `dag → board → presence`、`presence → presence-status`（`presence` 是 facade），跨组依赖以各文件 import 为准；
  另有大量模块经 `tests/host/`、`tests/client/` 的立面覆盖。
  （`client/cultivation/` 下另有 `cultivation-actions`＝人侧动作面纯模块：命令线构造 + host 结果折算 + 文案表；
  `CultivationCompose.tsx`＝创作面表单——2026-10-17 培养 GUI 卡）
- `client/` —— **client 注册入口与浏览器面**，顶层只留 `index.ts`（`dsh.client` 注入面及组合）、`locales.ts`（typed `company` 字典）与 `roles.ts`（角色表达层取用缝），其余按关切分目录
  （2026-11-03 第六轮；**清单 = `client/` 目录本身**，每组 = 一个目录，读目录名即知职责）：
  - `wiring/` —— 组合与接线：`context-wiring`（槽上下文）、`company-session-adapters`（Lead 归并 + follow 帧投影）、
    `attention-registry` / `attention-observers`、`member-navigation`、`title-state`、`instance-guard`、`error-ring`、
    **`delegation-keys`（委派键归一，不在 lib/）**。
  - `data/` —— 数据面：`company-data-plane`（路径/读模型常量）、`use-company-data`（订阅生命周期）、`deliverables-index`、
    `workspace-text`、`session-source`。
  - `ui/` —— 共用视觉件：`styles`（CSS 唯一源）、`Brand`、`RoleBadge`、`tab-icons`、`float-geometry`（浮窗几何）、
    `DelegationCard` / `TeamToolCard`（工具卡）。
  - `tabs/` —— 页签面：`company-tabs`（框架/浮出）、`company-panels`（看板/依赖图/在场/用量）、`company-tab-registration`
    （固定页签目录 → 类型/body/title/guide 四处贡献）、`tab-copy`（页签三处文案的 key 表与纯取用）、四个页签体 + `TasksPanel`。
  - `cultivation/` —— 培养域：`CultivationView` / `CultivationTab` 壳、看板/收件箱/创作/背景选择器、`cultivation-actions|data|context-data`、
    `use-cultivation-board`。
  - `startup/` —— 启动策略面：右栏「策略」页签、`startup.json` 读模型与选项数据。
  Cordis 各槽仍各自等待声明并负责卸载/重装；构建走 tsdown client 半（产物 `lib/client.js`）。

**UI 文案纪律（Phase 0 起）**：任何 company Web UI 文案从第一个 commit 就必须 zh+en；改 UI 前加载 `company-ui-change-definition` skill；文案只住 typed `company` 字典，纯 view model 返回 token 而不是中文。A4 未落地，勿引用；当前由 skill + review 守。

**构建**：`tsc -b packages/company-pack` + tsdown 两面（事实家 = [bootstrap](../../../docs/guides/bootstrap.md)）。
⚠ 本目录**不进 tarball**（`files` 的现行清单 = [package.json](../package.json)：只发 runtime 两半、
`presets/**`、`content/**`、`locale/`、`icon.svg`、`cordis.patch.yml`、`LICENSE`，不发 `src/**`（v3 起也没有 `workspace/**`））
——发布面是 `lib/`（generated，owner 表 = [pack README](../README.md)）。

**质量命令**：`pnpm lint`（oxlint）/ `pnpm dup`（jscpd）——范围与阈值住 [package.json](../../../package.json) scripts 与 [.jscpd.json](../../../.jscpd.json)（D28：文档不复述枚举），取舍 = [Note](../../../notes/archived/2026-11-04-lint-and-dup-upstream.md)。
